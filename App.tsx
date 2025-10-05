
import React, { useState, useCallback, ChangeEvent } from 'react';
import { Upload, Download, CheckCircle, Loader, AlertCircle, Edit, FileText, Plus, Trash2, ArrowLeft } from 'lucide-react';
import * as mammoth from 'mammoth';
import type { Metadata, Author } from './types';
import { extractMetadataFromText } from './services/geminiService';
import { generateJatsXml } from './services/xmlGenerator';

type Step = 1 | 2 | 3;

const initialMetadata: Metadata = {
  title: '', titleEn: '', journal: '', issn: '', volume: '', issue: '', year: '', doi: '', datePublished: '',
  abstract: '', abstractEn: '', keywords: '', keywordsEn: '',
  authors: [{ name: '', affiliation: '', email: '', orcid: '', country: '' }]
};

const App: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [extractedText, setExtractedText] = useState('');
  const [metadata, setMetadata] = useState<Metadata>(initialMetadata);
  const [xmlOutput, setXmlOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [step, setStep] = useState<Step>(1);
  const [error, setError] = useState('');

  const handleFileUpload = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.name.endsWith('.docx')) {
      setError('Por favor, sube un archivo con formato .docx');
      return;
    }
    
    setFile(f);
    setError('');
    setLoading(true);
    setLoadingMessage('Procesando documento...');
    
    try {
      const arrayBuffer = await f.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      const fullText = result.value;
      setExtractedText(fullText);
      
      setLoadingMessage('Extrayendo metadatos con IA...');
      const aiMetadata = await extractMetadataFromText(fullText);

      setMetadata(prev => ({
        ...prev,
        ...aiMetadata,
        year: prev.year || new Date().getFullYear().toString(),
        authors: aiMetadata.authors && aiMetadata.authors.length > 0 ? aiMetadata.authors : prev.authors,
      }));
      setStep(2);
    } catch (err: any) {
      setError(`Error al procesar el archivo: ${err.message}`);
      setFile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleGenerateXML = useCallback(() => {
    setLoading(true);
    setLoadingMessage('Generando XML...');
    try {
      const xmlString = generateJatsXml(metadata, extractedText);
      setXmlOutput(xmlString);
      setStep(3);
      setError('');
    } catch (err: any) {
      setError(`Error al generar el XML: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [metadata, extractedText]);

  const handleDownloadXML = useCallback(() => {
    try {
      const blob = new Blob([xmlOutput], { type: 'application/xml;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'article_JATS_SPS.xml';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError('Error al descargar el archivo: ' + err.message);
    }
  }, [xmlOutput]);

  const handleReset = () => {
    setFile(null);
    setExtractedText('');
    setMetadata(initialMetadata);
    setXmlOutput('');
    setError('');
    setStep(1);
  };
  
  const handleMetadataChange = (field: keyof Metadata, value: string) => {
    setMetadata(prev => ({ ...prev, [field]: value }));
  };

  const handleAuthorChange = (index: number, field: keyof Author, value: string) => {
    const newAuthors = [...metadata.authors];
    newAuthors[index] = { ...newAuthors[index], [field]: value };
    setMetadata(prev => ({ ...prev, authors: newAuthors }));
  };

  const addAuthor = () => {
    setMetadata(prev => ({ ...prev, authors: [...prev.authors, { name: '', affiliation: '', email: '', orcid: '', country: '' }] }));
  };

  const removeAuthor = (index: number) => {
    setMetadata(prev => ({ ...prev, authors: prev.authors.filter((_, i) => i !== index) }));
  };
  
  const renderStep = () => {
    switch (step) {
      case 1:
        return <FileUploadStep onFileUpload={handleFileUpload} file={file} />;
      case 2:
        return <MetadataFormStep 
          metadata={metadata}
          onMetadataChange={handleMetadataChange}
          onAuthorChange={handleAuthorChange}
          onAddAuthor={addAuthor}
          onRemoveAuthor={removeAuthor}
          onGenerateXML={handleGenerateXML}
          onBack={() => setStep(1)}
        />;
      case 3:
        return <XmlResultStep
          xmlOutput={xmlOutput}
          onDownload={handleDownloadXML}
          onEdit={() => setStep(2)}
          onReset={handleReset}
        />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans p-4 sm:p-6 lg:p-8">
      <main className="max-w-5xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-blue-700">Conversor Word a JATS XML</h1>
          <p className="text-lg text-gray-600 mt-2">Compatible con SciELO Publishing Schema (SPS)</p>
        </header>
        
        <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 relative">
          {loading && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col justify-center items-center z-20 rounded-2xl">
              <Loader className="w-12 h-12 animate-spin text-blue-600" />
              <p className="text-lg text-gray-700 mt-4">{loadingMessage}</p>
            </div>
          )}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {renderStep()}
        </div>
      </main>
    </div>
  );
};

const FileUploadStep: React.FC<{onFileUpload: (e: ChangeEvent<HTMLInputElement>) => void; file: File | null}> = ({ onFileUpload, file }) => (
  <div className="flex flex-col items-center justify-center text-center">
    <div className="w-full border-4 border-dashed border-gray-200 rounded-xl p-8 sm:p-16 hover:border-blue-400 transition-colors duration-300 bg-gray-50">
      <Upload className="w-20 h-20 mx-auto text-gray-300 mb-4" />
      <h2 className="text-2xl font-semibold text-gray-700 mb-2">Arrastra y suelta o selecciona tu artículo</h2>
      <p className="text-gray-500 mb-6">Solo se aceptan archivos en formato .docx</p>
      <label className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold cursor-pointer hover:bg-blue-700 inline-block transition-all transform hover:scale-105 shadow-md">
        Seleccionar Archivo
        <input type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={onFileUpload} className="hidden" />
      </label>
      {file && (
        <div className="mt-6 text-green-600 flex items-center justify-center font-medium">
          <CheckCircle className="w-6 h-6 mr-2" />
          <span>{file.name}</span>
        </div>
      )}
    </div>
  </div>
);

const MetadataFormStep: React.FC<{
  metadata: Metadata;
  onMetadataChange: (field: keyof Metadata, value: string) => void;
  onAuthorChange: (index: number, field: keyof Author, value: string) => void;
  onAddAuthor: () => void;
  onRemoveAuthor: (index: number) => void;
  onGenerateXML: () => void;
  onBack: () => void;
}> = ({ metadata, onMetadataChange, onAuthorChange, onAddAuthor, onRemoveAuthor, onGenerateXML, onBack }) => (
  <div>
    <h2 className="text-3xl font-bold mb-6 text-gray-800 border-b pb-4">Revisar y Completar Metadatos</h2>
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField label="Título (ES/PT)" value={metadata.title} onChange={e => onMetadataChange('title', e.target.value)} required />
        <FormField label="Título (EN)" value={metadata.titleEn} onChange={e => onMetadataChange('titleEn', e.target.value)} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <FormField label="Revista" value={metadata.journal} onChange={e => onMetadataChange('journal', e.target.value)} required />
        <FormField label="ISSN" value={metadata.issn} onChange={e => onMetadataChange('issn', e.target.value)} placeholder="0000-0000" />
        <FormField label="Volumen" value={metadata.volume} onChange={e => onMetadataChange('volume', e.target.value)} />
        <FormField label="Número" value={metadata.issue} onChange={e => onMetadataChange('issue', e.target.value)} />
        <FormField label="Año" value={metadata.year} onChange={e => onMetadataChange('year', e.target.value)} placeholder="YYYY" />
        <FormField label="Fecha de Publicación" type="date" value={metadata.datePublished} onChange={e => onMetadataChange('datePublished', e.target.value)} />
        <FormField label="DOI" value={metadata.doi} onChange={e => onMetadataChange('doi', e.target.value)} placeholder="10.xxxx/xxxxx" />
      </div>
      <FormField as="textarea" label="Resumen (ES/PT)" value={metadata.abstract} onChange={e => onMetadataChange('abstract', e.target.value)} rows={4} />
      <FormField as="textarea" label="Abstract (EN)" value={metadata.abstractEn} onChange={e => onMetadataChange('abstractEn', e.target.value)} rows={4} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField label="Palabras Clave (ES/PT)" value={metadata.keywords} onChange={e => onMetadataChange('keywords', e.target.value)} placeholder="separadas por comas" />
        <FormField label="Keywords (EN)" value={metadata.keywordsEn} onChange={e => onMetadataChange('keywordsEn', e.target.value)} placeholder="comma-separated" />
      </div>

      <div className="border-t pt-6">
        <h3 className="text-xl font-bold mb-4">Autores</h3>
        <div className="space-y-4">
        {metadata.authors.map((author, i) => (
          <div key={i} className="p-4 bg-gray-50 rounded-lg border">
            <div className="flex justify-between items-center mb-4">
              <span className="font-semibold text-gray-700">Autor {i + 1}</span>
              {metadata.authors.length > 1 && (
                <button onClick={() => onRemoveAuthor(i)} className="text-red-600 hover:text-red-800 flex items-center text-sm font-medium">
                  <Trash2 className="w-4 h-4 mr-1" /> Eliminar
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Nombre Completo" value={author.name} onChange={e => onAuthorChange(i, 'name', e.target.value)} required />
              <FormField label="Afiliación" value={author.affiliation} onChange={e => onAuthorChange(i, 'affiliation', e.target.value)} required />
              <FormField label="País" value={author.country} onChange={e => onAuthorChange(i, 'country', e.target.value)} required placeholder="Ej: Brasil" />
              <FormField label="Email" type="email" value={author.email} onChange={e => onAuthorChange(i, 'email', e.target.value)} />
              <div className="md:col-span-2">
                <FormField label="ORCID" value={author.orcid} onChange={e => onAuthorChange(i, 'orcid', e.target.value)} placeholder="0000-0000-0000-0000" />
              </div>
            </div>
          </div>
        ))}
        </div>
        <button onClick={onAddAuthor} className="mt-4 bg-blue-100 text-blue-800 px-4 py-2 rounded-lg font-semibold hover:bg-blue-200 transition-colors flex items-center">
          <Plus className="w-5 h-5 mr-2" /> Agregar Autor
        </button>
      </div>
      
      <div className="flex justify-between items-center pt-6 border-t mt-6">
        <button onClick={onBack} className="px-6 py-3 border rounded-lg font-semibold hover:bg-gray-100 transition-colors flex items-center"><ArrowLeft className="w-5 h-5 mr-2" /> Volver</button>
        <button onClick={onGenerateXML} disabled={!metadata.title || !metadata.journal} className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors shadow-md flex items-center">
          Generar XML <FileText className="w-5 h-5 ml-2" />
        </button>
      </div>
    </div>
  </div>
);

const XmlResultStep: React.FC<{
  xmlOutput: string;
  onDownload: () => void;
  onEdit: () => void;
  onReset: () => void;
}> = ({ xmlOutput, onDownload, onEdit, onReset }) => (
  <div>
    <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6">
      <h2 className="text-3xl font-bold text-gray-800 mb-4 sm:mb-0">XML Generado Exitosamente</h2>
      <button onClick={onDownload} className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 flex items-center justify-center transition-colors shadow-md">
        <Download className="w-5 h-5 mr-2" /> Descargar Archivo XML
      </button>
    </div>
    
    <div className="bg-green-50 p-4 rounded-lg mb-6 border-2 border-green-200">
      <div className="flex items-start">
        <CheckCircle className="w-6 h-6 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-semibold text-green-800">¡Éxito! El archivo JATS SPS está listo.</p>
          <p className="text-sm text-green-700">Se recomienda validar el archivo con el StyleChecker de SciELO antes de enviarlo.</p>
        </div>
      </div>
    </div>
    
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 max-h-96 overflow-auto">
      <pre className="text-sm text-green-300 font-mono whitespace-pre-wrap break-words">{xmlOutput}</pre>
    </div>
    
    <div className="flex flex-col sm:flex-row justify-between mt-8 gap-4">
      <button onClick={onEdit} className="px-6 py-3 border rounded-lg font-semibold hover:bg-gray-100 transition-colors flex items-center justify-center">
        <Edit className="w-5 h-5 mr-2" /> Editar Metadatos
      </button>
      <button onClick={onReset} className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-md flex items-center justify-center">
        Convertir Nuevo Documento
      </button>
    </div>
  </div>
);

const FormField: React.FC<{
    label: string;
    value: string;
    onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    type?: string;
    placeholder?: string;
    required?: boolean;
    as?: 'input' | 'textarea';
    rows?: number;
}> = ({ label, value, onChange, type = 'text', placeholder, required = false, as = 'input', rows = 3 }) => {
    const commonProps = {
        value,
        onChange,
        placeholder,
        required,
        className: "w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow duration-200 bg-gray-50"
    };

    return (
        <div>
            <label className="block font-medium mb-2 text-gray-700">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            {as === 'textarea' ? (
                <textarea {...commonProps} rows={rows}></textarea>
            ) : (
                <input type={type} {...commonProps} />
            )}
        </div>
    );
};

export default App;