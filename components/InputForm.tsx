import React, { useState, useCallback } from 'react';
import { Upload, FileText, CheckCircle2, AlertCircle, X, File } from 'lucide-react';
// @ts-ignore
import mammoth from 'mammoth';

interface InputFormProps {
  onSubmit: (content: string | { mimeType: string, data: string }, party: string) => void;
  isLoading: boolean;
}

const InputForm: React.FC<InputFormProps> = ({ onSubmit, isLoading }) => {
  const [party, setParty] = useState('');
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{ name: string; type: string; data: string } | null>(null);
  const [isSample, setIsSample] = useState(false);

  // Sample data constant
  const SAMPLE_TEXT = `SERVICE AGREEMENT

This Agreement is made between Client Inc. ("Client") and Vendor Ltd ("Vendor").

1. OBLIGATIONS
The Vendor shall deliver the software deliverables within 30 days of the Effective Date.
The Vendor must provide monthly status reports by the 5th of each following month.
If the Client identifies a Critical Bug, the Vendor must resolve it within 24 hours of notice.

2. TERM AND TERMINATION
This Agreement commences on January 1, 2024 and shall continue for a fixed period of 12 months.
It shall automatically renew for successive 12-month periods unless either party gives written notice of non-renewal at least 60 days prior to the end of the then-current term.
Either party may terminate for convenience with 90 days' written notice via email to legal@example.com.
Upon termination, Vendor shall destroy all Client data within 5 days.

3. FEES
Invoices must be submitted by the Vendor no later than the 10th day of the month.`;

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const processFile = (file: File) => {
    // 10MB limit
    if (file.size > 10 * 1024 * 1024) {
      setError('File size exceeds 10MB limit.');
      return;
    }

    const isPdf = file.type === 'application/pdf';
    const isDocx = file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.name.endsWith('.docx');
    const isText = file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.md') || file.name.endsWith('.json');

    if (!isPdf && !isDocx && !isText) {
        setError('Unsupported file type. Please upload PDF, Word (.docx), or Text files.');
        return;
    }

    const reader = new FileReader();

    if (isDocx) {
        // Handle Word Documents -> Extract Text
        reader.onload = async (e) => {
            const arrayBuffer = e.target?.result as ArrayBuffer;
            try {
                const result = await mammoth.extractRawText({ arrayBuffer });
                setSelectedFile({
                    name: file.name,
                    type: 'text/plain', // Treat extracted content as text
                    data: result.value // The raw extracted text
                });
                setError('');
                setIsSample(false);
            } catch (err) {
                console.error(err);
                setError("Failed to parse Word document. Please try converting to PDF or Text.");
            }
        };
        reader.readAsArrayBuffer(file);

    } else if (isText) {
        // Handle Text Files -> Read as String
        reader.onload = (e) => {
            const result = e.target?.result as string;
            setSelectedFile({
                name: file.name,
                type: 'text/plain',
                data: result
            });
            setError('');
            setIsSample(false);
        };
        reader.readAsText(file);

    } else {
        // Handle PDF (and others) -> Read as Base64 for Gemini Vision/Multimodal
        reader.onload = (e) => {
            const result = e.target?.result as string;
            const base64Data = result.split(',')[1]; 
            setSelectedFile({
                name: file.name,
                type: file.type,
                data: base64Data
            });
            setError('');
            setIsSample(false);
        };
        reader.onerror = () => setError('Failed to read file.');
        reader.readAsDataURL(file);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setIsSample(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!party.trim()) {
      setError('Please provide the party name.');
      return;
    }

    if (!selectedFile && !isSample) {
        setError('Please upload a contract or load sample data.');
        return;
    }

    setError('');
    
    if (isSample) {
        onSubmit(SAMPLE_TEXT, party);
    } else if (selectedFile) {
        // If we extracted text (DOCX or TXT), send it as a string to be used in prompt
        if (selectedFile.type === 'text/plain') {
            onSubmit(selectedFile.data, party);
        } else {
            // Otherwise (PDF), send as object for inlineData
            onSubmit({ mimeType: selectedFile.type, data: selectedFile.data }, party);
        }
    }
  };

  const loadSample = () => {
    setParty("Vendor");
    setSelectedFile(null);
    setIsSample(true);
    setError('');
  };

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-indigo-100 p-2 rounded-lg">
            <FileText className="w-6 h-6 text-indigo-600" />
          </div>
          <h2 className="text-2xl font-semibold text-slate-800">Analyze Contract</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="party" className="block text-sm font-medium text-slate-700 mb-1">
              Party Name
            </label>
            <div className="text-xs text-slate-500 mb-2">
              Who are we analyzing this for? (e.g., "The Vendor", "Supplier", "Company")
            </div>
            <input
              type="text"
              id="party"
              value={party}
              onChange={(e) => setParty(e.target.value)}
              placeholder="e.g. Vendor Ltd"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Contract Document
            </label>
            <div className="text-xs text-slate-500 mb-2">
              Upload the contract PDF, Word, or Text file.
            </div>

            {!selectedFile && !isSample ? (
                <div 
                    className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                        dragActive ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50'
                    }`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                >
                    <input 
                        type="file" 
                        id="file-upload" 
                        className="hidden" 
                        onChange={handleChange}
                        accept=".pdf,.txt,.md,.json,.docx,.doc"
                    />
                    <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center justify-center w-full h-full">
                        <Upload className={`w-10 h-10 mb-3 ${dragActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                        <p className="text-sm font-medium text-slate-700">
                            <span className="text-indigo-600 hover:text-indigo-700">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-slate-500 mt-1">PDF, DOCX, TXT (max 10MB)</p>
                    </label>
                </div>
            ) : (
                <div className="relative bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-white p-2 rounded-lg border border-slate-200">
                            <File className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-800">
                                {isSample ? "Sample Contract.txt" : selectedFile?.name}
                            </p>
                            <p className="text-xs text-slate-500">
                                {isSample ? "Text Data" : selectedFile?.type === 'text/plain' ? 'Extracted Text' : selectedFile?.type}
                            </p>
                        </div>
                    </div>
                    <button 
                        type="button" 
                        onClick={removeFile}
                        className="p-1 hover:bg-slate-200 rounded-full transition-colors text-slate-500"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg text-sm">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
             <button
              type="button"
              onClick={loadSample}
              className="text-sm text-slate-500 hover:text-indigo-600 underline"
            >
              Load Sample Data
            </button>

            <button
              type="submit"
              disabled={isLoading || (!selectedFile && !isSample)}
              className={`flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-all ${
                isLoading || (!selectedFile && !isSample) ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  Analyze Obligations
                </>
              )}
            </button>
          </div>
        </form>
      </div>
      <div className="bg-slate-50 px-8 py-4 border-t border-slate-200 text-xs text-slate-500">
        <p>AI can make mistakes. Please verify important deadlines with original documents.</p>
      </div>
    </div>
  );
};

export default InputForm;