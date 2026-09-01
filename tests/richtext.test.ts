import { describe, expect, it } from 'vitest';
import {
  isRichEmpty,
  plainToRich,
  richToPlain,
  sanitizeRich,
} from '@/lib/richtext';

describe('sanitizeRich — mise en forme conservée', () => {
  it('garde gras, italique, souligné et barré', () => {
    expect(sanitizeRich('<b>gras</b>')).toBe('<b>gras</b>');
    expect(sanitizeRich('<i>ital</i>')).toBe('<i>ital</i>');
    expect(sanitizeRich('<u>soul</u>')).toBe('<u>soul</u>');
    expect(sanitizeRich('<s>barre</s>')).toBe('<s>barre</s>');
  });

  it('ramène strong et em aux balises canoniques', () => {
    expect(sanitizeRich('<strong>a</strong><em>b</em>')).toBe('<b>a</b><i>b</i>');
  });

  it('traduit la couleur du navigateur en classe de thème', () => {
    expect(sanitizeRich('<span style="color: rgb(220, 38, 38)">alerte</span>')).toBe(
      '<span class="rt-c-rouge">alerte</span>',
    );
    expect(sanitizeRich('<font color="#2563eb">bleu</font>')).toBe(
      '<span class="rt-c-bleu">bleu</span>',
    );
  });

  it('traduit le surlignage', () => {
    expect(sanitizeRich('<span style="background-color: #fef08a">clé</span>')).toBe(
      '<span class="rt-m-jaune">clé</span>',
    );
  });

  it('traduit les tailles en points', () => {
    // Attribut <font size> : ancienne echelle 1 a 7 du navigateur.
    expect(sanitizeRich('<font size="6">grand</font>')).toBe('<span class="rt-pt-18">grand</span>');
    // Feuille de style : points ou pixels, arrondis a la taille la plus proche.
    expect(sanitizeRich('<span style="font-size: 24pt">x</span>')).toBe(
      '<span class="rt-pt-24">x</span>',
    );
    expect(sanitizeRich('<span style="font-size: 32px">x</span>')).toBe(
      '<span class="rt-pt-24">x</span>',
    );
    expect(sanitizeRich('<span class="rt-pt-14">x</span>')).toBe('<span class="rt-pt-14">x</span>');
  });

  it('traduit les polices proposées', () => {
    expect(sanitizeRich('<font face="Times New Roman">x</font>')).toBe(
      '<span class="rt-f-times">x</span>',
    );
    expect(sanitizeRich('<span style="font-family: Arial, sans-serif">x</span>')).toBe(
      '<span class="rt-f-arial">x</span>',
    );
    expect(sanitizeRich('<span class="rt-f-montserrat">x</span>')).toBe(
      '<span class="rt-f-montserrat">x</span>',
    );
    expect(sanitizeRich('<span class="rt-f-roboto">x</span>')).toBe(
      '<span class="rt-f-roboto">x</span>',
    );
  });

  it('la taille du corps de texte ne laisse aucune classe', () => {
    expect(sanitizeRich('<font size="3">normal</font>')).toBe('normal');
    expect(sanitizeRich('<span class="rt-pt-11">normal</span>')).toBe('normal');
  });

  it('le retour à la normale annule une mise en forme englobante', () => {
    expect(
      sanitizeRich('<span class="rt-c-rouge">rouge <span class="rt-c-defaut">normal</span></span>'),
    ).toBe('<span class="rt-c-rouge">rouge </span>normal');
    expect(
      sanitizeRich('<span class="rt-m-jaune">jaune <span class="rt-m-aucun">rien</span></span>'),
    ).toBe('<span class="rt-m-jaune">jaune </span>rien');
    expect(
      sanitizeRich('<span class="rt-f-times">times <span class="rt-f-normal">normal</span></span>'),
    ).toBe('<span class="rt-f-times">times </span>normal');
  });

  it('combine plusieurs mises en forme dans un ordre stable', () => {
    const once = sanitizeRich('<b><span style="color:#16a34a"><i>vert</i></span></b>');
    expect(once).toBe('<b><i><span class="rt-c-vert">vert</span></i></b>');
    expect(sanitizeRich(once)).toBe(once);
  });

  it('est idempotent sur son propre résultat', () => {
    const source = '<b>a</b><span class="rt-c-jaune rt-pt-16">b</span><br>c';
    expect(sanitizeRich(sanitizeRich(source))).toBe(sanitizeRich(source));
  });
});

describe('sanitizeRich — ce qui ne doit jamais passer', () => {
  it('supprime un script et son contenu', () => {
    expect(sanitizeRich('avant<script>alert(1)</script>après')).toBe('avantaprès');
    expect(sanitizeRich('<script>alert(1)')).toBe('');
  });

  it('supprime style, iframe, svg et objet', () => {
    expect(sanitizeRich('<style>body{}</style>ok')).toBe('ok');
    expect(sanitizeRich('<iframe src="http://x"></iframe>ok')).toBe('ok');
    expect(sanitizeRich('<svg onload="alert(1)"></svg>ok')).toBe('ok');
    expect(sanitizeRich('<object data="x"></object>ok')).toBe('ok');
  });

  it('retire les gestionnaires d’événements', () => {
    expect(sanitizeRich('<b onclick="alert(1)">texte</b>')).toBe('<b>texte</b>');
    expect(sanitizeRich('<span onmouseover="steal()">texte</span>')).toBe('texte');
  });

  it('retire les images et les adresses', () => {
    expect(sanitizeRich('<img src="x" onerror="alert(1)">texte')).toBe('texte');
    expect(sanitizeRich('<a href="javascript:alert(1)">lien</a>')).toBe('lien');
  });

  it('ignore une couleur ou une police hors de la palette', () => {
    expect(sanitizeRich('<span style="color:#123456">x</span>')).toBe('x');
    expect(sanitizeRich('<span style="font-family: Comic Sans MS">x</span>')).toBe('x');
  });

  it('n’exécute pas un HTML encodé en entités', () => {
    expect(sanitizeRich('&#60;script&#62;alert(1)&#60;/script&#62;')).toBe(
      '&lt;script&gt;alert(1)&lt;/script&gt;',
    );
  });

  it('échappe un chevron isolé au lieu d’ouvrir une balise', () => {
    expect(sanitizeRich('5 < 10 et 10 > 5')).toBe('5 &lt; 10 et 10 &gt; 5');
  });

  it('ne garde aucun attribut de style en dur', () => {
    const out = sanitizeRich('<span style="position:fixed;top:0;background:url(x)">x</span>');
    expect(out).not.toContain('style');
    expect(out).toBe('x');
  });

  it('résiste à du HTML mal formé', () => {
    expect(sanitizeRich('<b>gras<i>et ital')).toBe('<b>gras</b><b><i>et ital</i></b>');
    expect(sanitizeRich('</b></i>texte')).toBe('texte');
    expect(sanitizeRich('<<b>>x')).toBe('&lt;<b>&gt;x</b>');
  });
});

describe('sauts de ligne et texte hérité', () => {
  it('convertit les retours à la ligne du texte brut existant', () => {
    expect(sanitizeRich('ligne 1\nligne 2')).toBe('ligne 1<br>ligne 2');
  });

  it('garde les <br> et les blocs comme des retours à la ligne', () => {
    expect(sanitizeRich('a<br>b')).toBe('a<br>b');
    expect(sanitizeRich('<div>a</div><div>b</div>')).toBe('a<br>b');
  });

  it('échappe le texte brut hérité contenant des chevrons', () => {
    expect(sanitizeRich('article <1240> du code')).toBe('article &lt;1240&gt; du code');
  });
});

describe('richToPlain / plainToRich / isRichEmpty', () => {
  it('retire la mise en forme', () => {
    expect(richToPlain('<b>gras</b> et <span class="rt-c-vert">vert</span>')).toBe('gras et vert');
    expect(richToPlain('a<br>b')).toBe('a\nb');
  });

  it('fait l’aller-retour sur du texte brut', () => {
    const source = 'Article 1240 : « responsabilité » & suite\nligne 2';
    expect(richToPlain(plainToRich(source))).toBe(source);
  });

  it('reconnaît un contenu vide', () => {
    expect(isRichEmpty('')).toBe(true);
    expect(isRichEmpty('<b></b>')).toBe(true);
    expect(isRichEmpty('<br>')).toBe(true);
    expect(isRichEmpty('&nbsp;')).toBe(true);
    expect(isRichEmpty('<b>a</b>')).toBe(false);
  });
});
