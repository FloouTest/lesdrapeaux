// Canonical quiz data. Names correspond to capitals.js keys; codes are ISO 3166-1 alpha-2.
const rows = {
  Afrique: `Afrique du Sud:za|Algérie:dz|Angola:ao|Bénin:bj|Botswana:bw|Burkina Faso:bf|Burundi:bi|Cameroun:cm|Cap-Vert:cv|République centrafricaine:cf|Comores:km|Congo:cg|République démocratique du Congo:cd|Côte d'Ivoire:ci|Djibouti:dj|Égypte:eg|Érythrée:er|Éthiopie:et|Gabon:ga|Gambie:gm|Ghana:gh|Guinée:gn|Guinée-Bissau:gw|Guinée équatoriale:gq|Kenya:ke|Lesotho:ls|Liberia:lr|Libye:ly|Madagascar:mg|Malawi:mw|Mali:ml|Maroc:ma|Maurice:mu|Mauritanie:mr|Mozambique:mz|Namibie:na|Niger:ne|Nigeria:ng|Ouganda:ug|Rwanda:rw|Sao Tomé-et-Principe:st|Sénégal:sn|Seychelles:sc|Sierra Leone:sl|Somalie:so|Soudan:sd|Soudan du Sud:ss|Swaziland:sz|Tanzanie:tz|Tchad:td|Togo:tg|Tunisie:tn|Zambie:zm|Zimbabwe:zw`,
  Amérique: `Antigua-et-Barbuda:ag|Argentine:ar|Bahamas:bs|Barbade:bb|Belize:bz|Bolivie:bo|Brésil:br|Canada:ca|Chili:cl|Colombie:co|Costa Rica:cr|Cuba:cu|République dominicaine:do|Dominique:dm|Équateur:ec|États-Unis:us|Grenade:gd|Guatemala:gt|Guyana:gy|Haïti:ht|Honduras:hn|Jamaïque:jm|Mexique:mx|Nicaragua:ni|Panama:pa|Paraguay:py|Pérou:pe|Saint-Christophe-et-Niévès:kn|Sainte-Lucie:lc|Saint-Vincent-et-les Grenadines:vc|Salvador:sv|Suriname:sr|Trinité-et-Tobago:tt|Uruguay:uy|Venezuela:ve`,
  Asie: `Afghanistan:af|Arabie saoudite:sa|Bahreïn:bh|Bangladesh:bd|Bhoutan:bt|Birmanie:mm|Brunei:bn|Cambodge:kh|Chine:cn|Corée du Nord:kp|Corée du Sud:kr|Émirats arabes unis:ae|Inde:in|Indonésie:id|Irak:iq|Iran:ir|Israël:il|Japon:jp|Jordanie:jo|Kazakhstan:kz|Kirghizistan:kg|Koweït:kw|Laos:la|Liban:lb|Malaisie:my|Maldives:mv|Mongolie:mn|Népal:np|Oman:om|Ouzbékistan:uz|Pakistan:pk|Philippines:ph|Qatar:qa|Singapour:sg|Sri Lanka:lk|Syrie:sy|Tadjikistan:tj|Taïwan:tw|Thaïlande:th|Timor oriental:tl|Turkménistan:tm|Turquie:tr|Viêt Nam:vn|Yémen:ye`,
  Europe: `Albanie:al|Allemagne:de|Andorre:ad|Arménie:am|Autriche:at|Azerbaïdjan:az|Belgique:be|Biélorussie:by|Bosnie-Herzégovine:ba|Bulgarie:bg|Chypre:cy|Croatie:hr|Danemark:dk|Espagne:es|Estonie:ee|Finlande:fi|France:fr|Géorgie:ge|Grèce:gr|Hongrie:hu|Irlande:ie|Islande:is|Italie:it|Lettonie:lv|Liechtenstein:li|Lituanie:lt|Luxembourg:lu|Macédoine du Nord:mk|Malte:mt|Moldavie:md|Monaco:mc|Monténégro:me|Norvège:no|Pays-Bas:nl|Pologne:pl|Portugal:pt|République tchèque:cz|Roumanie:ro|Royaume-Uni:gb|Russie:ru|Saint-Marin:sm|Serbie:rs|Slovaquie:sk|Slovénie:si|Suède:se|Suisse:ch|Ukraine:ua|Vatican:va`,
  Océanie: `Australie:au|Fidji:fj|Kiribati:ki|Marshall:mh|Micronésie:fm|Nauru:nr|Nouvelle-Zélande:nz|Palaos:pw|Papouasie-Nouvelle-Guinée:pg|Salomon:sb|Samoa:ws|Tonga:to|Tuvalu:tv|Vanuatu:vu`,
};
export const COUNTRIES = Object.fromEntries(
  Object.entries(rows).map(([region, row]) => [
    region,
    row.split("|").map((value) => {
      const i = value.lastIndexOf(":");
      const name = value.slice(0, i),
        code = value.slice(i + 1);
      return {
        name,
        code,
        region,
        flag: `https://flagcdn.com/w320/${code}.png`,
      };
    }),
  ]),
);
export const ALL_COUNTRIES = Object.values(COUNTRIES).flat();
