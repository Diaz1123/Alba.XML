import type { Metadata } from '../types';

const escapeXml = (str: string | null | undefined): string => {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

const COUNTRY_CODES: { [key: string]: string } = {
  'argentina': 'AR', 'bolivia': 'BO', 'brasil': 'BR', 'brazil': 'BR',
  'chile': 'CL', 'colombia': 'CO', 'costa rica': 'CR', 'cuba': 'CU',
  'ecuador': 'EC', 'el salvador': 'SV', 'españa': 'ES', 'spain': 'ES',
  'estados unidos': 'US', 'united states': 'US', 'usa': 'US',
  'guatemala': 'GT', 'honduras': 'HN', 'méxico': 'MX', 'mexico': 'MX',
  'nicaragua': 'NI', 'panamá': 'PA', 'paraguay': 'PY', 'perú': 'PE',
  'peru': 'PE', 'portugal': 'PT', 'puerto rico': 'PR',
  'república dominicana': 'DO', 'dominican republic': 'DO',
  'uruguay': 'UY', 'venezuela': 'VE',
};

const getCountryCode = (countryName: string): string => {
    if (!countryName) return '';
    const normalizedName = countryName.trim().toLowerCase();
    return COUNTRY_CODES[normalizedName] || '';
};

const generateAuthorsContrib = (metadata: Metadata): string => {
  return metadata.authors.map((author, i) => {
    const nameParts = author.name.trim().split(' ');
    const surname = nameParts.length > 1 ? nameParts.pop() : author.name;
    const givenNames = nameParts.join(' ');
    
    return `
    <contrib contrib-type="author">
      ${author.orcid ? `<contrib-id contrib-id-type="orcid">${escapeXml(author.orcid.startsWith('http') ? author.orcid : `https://orcid.org/${author.orcid.replace(/[^0-9X-]/gi, '')}`)}</contrib-id>` : ''}
      <name>
        <surname>${escapeXml(surname)}</surname>
        <given-names>${escapeXml(givenNames)}</given-names>
      </name>
      ${author.email ? `<email>${escapeXml(author.email)}</email>` : ''}
      <xref ref-type="aff" rid="aff${i + 1}"/>
    </contrib>`;
  }).join('');
};

const generateAuthorsAff = (metadata: Metadata): string => {
    return metadata.authors.map((author, i) => {
      const countryCode = getCountryCode(author.country);
      return `
    <aff id="aff${i + 1}">
      <label>${i + 1}</label>
      <institution content-type="original">${escapeXml(author.affiliation)}</institution>
      <country${countryCode ? ` country="${countryCode}"` : ''}>${escapeXml(author.country)}</country>
    </aff>`;
    }).join('');
};

const generateKeywords = (keywords: string): string => {
    return keywords.split(',')
        .map(kw => kw.trim())
        .filter(kw => kw)
        .map(kw => `        <kwd>${escapeXml(kw)}</kwd>`)
        .join('\n');
};

const generateBodyContent = (bodyText: string): string => {
    return bodyText.split(/\n+/).map(p => `<p>${escapeXml(p)}</p>`).join('\n      ');
};

export const generateJatsXml = (metadata: Metadata, bodyText: string): string => {
  const { year, month, day } = metadata.datePublished 
    ? { 
        year: metadata.datePublished.substring(0, 4),
        month: metadata.datePublished.substring(5, 7),
        day: metadata.datePublished.substring(8, 10),
      }
    : { year: metadata.year || new Date().getFullYear().toString(), month: '', day: '' };

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE article PUBLIC "-//NLM//DTD JATS (Z39.96) Journal Publishing DTD v1.1 20151215//EN" "https://jats.nlm.nih.gov/publishing/1.1/JATS-journalpublishing1.dtd">
<article dtd-version="1.1" specific-use="sps-1.9" article-type="research-article" xml:lang="es" xmlns:xlink="http://www.w3.org/1999/xlink">
  <front>
    <journal-meta>
      <journal-id journal-id-type="publisher-id">YOUR-JOURNAL-ID</journal-id>
      <journal-title-group>
        <journal-title>${escapeXml(metadata.journal)}</journal-title>
        <abbrev-journal-title abbrev-type="publisher">Your J. Abbrev.</abbrev-journal-title>
      </journal-title-group>
      <issn pub-type="epub">${escapeXml(metadata.issn)}</issn>
      <publisher>
        <publisher-name>Your Publisher Name</publisher-name>
      </publisher>
    </journal-meta>
    <article-meta>
      ${metadata.doi ? `<article-id pub-id-type="doi">${escapeXml(metadata.doi)}</article-id>` : `<!-- <article-id pub-id-type="doi">10.1590/0000-0000000000000</article-id> -->`}
      <article-categories>
        <subj-group subj-group-type="heading">
          <subject>Artículos</subject>
        </subj-group>
      </article-categories>
      <title-group>
        <article-title>${escapeXml(metadata.title)}</article-title>
        ${metadata.titleEn ? `<trans-title-group xml:lang="en">
          <trans-title>${escapeXml(metadata.titleEn)}</trans-title>
        </trans-title-group>` : ''}
      </title-group>
      <contrib-group>${generateAuthorsContrib(metadata)}
      </contrib-group>
      ${generateAuthorsAff(metadata)}
      <pub-date date-type="pub" publication-format="electronic">
        ${day ? `<day>${escapeXml(day)}</day>`: ''}
        ${month ? `<month>${escapeXml(month)}</month>`: ''}
        <year>${escapeXml(year)}</year>
      </pub-date>
      ${metadata.volume ? `<volume>${escapeXml(metadata.volume)}</volume>` : ''}
      ${metadata.issue ? `<issue>${escapeXml(metadata.issue)}</issue>` : ''}
      <fpage>1</fpage>
      <lpage>10</lpage>
      <permissions>
        <license license-type="open-access" xlink:href="http://creativecommons.org/licenses/by/4.0/" xml:lang="en">
          <license-p>This is an Open Access article distributed under the terms of the Creative Commons Attribution License, which permits unrestricted use, distribution, and reproduction in any medium, provided the original work is properly cited.</license-p>
        </license>
      </permissions>
      <abstract>
        <title>Resumen</title>
        <p>${escapeXml(metadata.abstract)}</p>
      </abstract>
      ${metadata.abstractEn ? `<trans-abstract xml:lang="en">
        <title>Abstract</title>
        <p>${escapeXml(metadata.abstractEn)}</p>
      </trans-abstract>` : ''}
      <kwd-group xml:lang="es">
        <title>Palabras clave</title>
${generateKeywords(metadata.keywords)}
      </kwd-group>
      ${metadata.keywordsEn ? `<kwd-group xml:lang="en">
        <title>Keywords</title>
${generateKeywords(metadata.keywordsEn)}
      </kwd-group>` : ''}
    </article-meta>
  </front>
  <body>
    <sec sec-type="intro">
      <title>Introducción</title>
      ${generateBodyContent(bodyText)}
    </sec>
  </body>
  <back>
    <ref-list>
      <title>Referencias</title>
      <ref id="B1">
        <label>1</label>
        <mixed-citation>Author, A. Article title. Journal Title. 2024;10(2):100-110.</mixed-citation>
        <element-citation publication-type="journal">
          <person-group person-group-type="author">
            <name>
              <surname>Author</surname>
              <given-names>A.</given-names>
            </name>
          </person-group>
          <article-title>Article title</article-title>
          <source>Journal Title</source>
          <year>2024</year>
          <volume>10</volume>
          <issue>2</issue>
          <fpage>100</fpage>
          <lpage>110</lpage>
        </element-citation>
      </ref>
    </ref-list>
  </back>
</article>`;
};