import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import yaml from 'js-yaml';
import Ajv from 'ajv';
import { describe, expect, it } from 'vitest';

/**
 * Valide electron-builder.yml avec le schéma d'electron-builder lui-même.
 *
 * Rien en local ne construisait l'installeur : les vérifications de bureau
 * lancent Electron depuis les sources, jamais electron-builder. Une clé mal
 * placée passait donc inaperçue jusqu'au build Windows, qui échouait trois
 * minutes plus tard. C'est arrivé avec `publisherName`, écrit sous `nsis`
 * alors qu'il appartient à `win`.
 */
const require = createRequire(import.meta.url);
const root = process.cwd();

const config = yaml.load(
  fs.readFileSync(path.join(root, 'electron-builder.yml'), 'utf8'),
) as Record<string, unknown>;

const schema = require('app-builder-lib/scheme.json');

describe('electron-builder.yml', () => {
  it('respecte le schéma d’electron-builder', () => {
    const ajv = new Ajv({
      allErrors: true,
      // Le schéma emploie des mots-clés maison qu'Ajv ne connaît pas.
      schemaId: 'auto',
      logger: false,
      unknownFormats: 'ignore',
    });
    ajv.addKeyword('typescript', { valid: true });
    ajv.addKeyword('customType', { valid: true });

    const validate = ajv.compile(schema);
    const ok = validate(config);
    const details = (validate.errors ?? [])
      .map((error) => `${error.dataPath || '(racine)'} ${error.message}`)
      .join('\n');
    expect(ok, details).toBe(true);
  });

  it('déclare bien l’éditeur au bon endroit', () => {
    const win = config.win as Record<string, Record<string, unknown>> | undefined;
    const nsis = config.nsis as Record<string, unknown> | undefined;
    // electron-builder 25 attend ce champ sous « win.signtoolOptions » ;
    // sous « nsis » la configuration est refusée, sous « win » elle est
    // acceptée mais annoncée comme dépréciée.
    expect(win?.signtoolOptions?.publisherName, 'publisherName doit être sous « win.signtoolOptions »').toBeTruthy();
    expect(win?.publisherName, 'publisherName ne doit plus être directement sous « win »').toBeUndefined();
    expect(nsis?.publisherName, 'publisherName n’existe pas sous « nsis »').toBeUndefined();
  });

  it('construit un installeur et une archive, pas un exécutable auto-extractible', () => {
    const targets = (config.win as { target: { target: string }[] }).target;
    expect(targets.map((entry) => entry.target)).toEqual(['nsis', 'zip']);
  });

  it('n’embarque pas l’utilitaire d’élévation', () => {
    // « elevate.exe » est un utilitaire d'élévation générique, très
    // régulièrement signalé par les antivirus. Une installation personnelle
    // n'en a aucun besoin : il ne doit pas se retrouver dans le paquet.
    const nsis = config.nsis as Record<string, unknown>;
    expect(nsis.perMachine).toBe(false);
    expect(nsis.allowElevation).toBe(false);
    expect(nsis.packElevateHelper).toBe(false);
  });
});
