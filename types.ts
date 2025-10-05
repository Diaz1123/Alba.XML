
export interface Author {
  name: string;
  affiliation: string;
  email: string;
  orcid: string;
  country: string;
}

export interface Metadata {
  title: string;
  titleEn: string;
  journal: string;
  issn: string;
  volume: string;
  issue: string;
  year: string;
  doi: string;
  datePublished: string;
  abstract: string;
  abstractEn: string;
  keywords: string;
  keywordsEn: string;
  authors: Author[];
}