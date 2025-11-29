import React, { useState } from 'react';
import { AppState, ContractAnalysis } from './types';
import InputForm from './components/InputForm';
import AnalysisResult from './components/AnalysisResult';
import { analyzeContract } from './services/geminiService';
import { Scale } from 'lucide-react';

// Extend AppState locally or generic usage, keeping it simple as we don't strictly enforce 'contractText' in AppState interface if we use local state here, 
// but to be clean, we should update AppState type or just ignore the mismatch if we don't export it. 
// However, I will just use `any` or loose typing for the content in state for this modification to avoid changing `types.ts`.
// Ideally, `contractText` in AppState should be `contractContent: string | {mimeType: string, data: string}`.

const App: React.FC = () => {
  const [step, setStep] = useState<'input' | 'processing' | 'results'>('input');
  const [partyName, setPartyName] = useState('');
  const [analysis, setAnalysis] = useState<ContractAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalysis = async (content: string | { mimeType: string, data: string }, party: string) => {
    setStep('processing');
    setPartyName(party);
    setError(null);
    
    try {
      const result = await analyzeContract(content, party);
      setAnalysis(result);
      setStep('results');
    } catch (err: any) {
      setStep('input');
      setError(err.message || "An error occurred during analysis. Please try again.");
    }
  };

  const reset = () => {
    setStep('input');
    setPartyName('');
    setAnalysis(null);
    setError(null);
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={reset}>
            <div className="bg-indigo-600 p-1.5 rounded-lg">
                <Scale className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-700 to-indigo-500">
              TermTrace
            </h1>
          </div>
          {step === 'results' && (
              <button 
                onClick={reset}
                className="text-sm text-slate-500 hover:text-indigo-600 font-medium transition-colors"
              >
                Analyze New Contract
              </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 py-12 px-4 sm:px-6 lg:px-8">
        {step === 'input' && (
          <InputForm onSubmit={handleAnalysis} isLoading={false} />
        )}

        {step === 'processing' && (
           <InputForm onSubmit={() => {}} isLoading={true} />
        )}

        {step === 'results' && analysis && (
          <AnalysisResult 
            data={analysis} 
            targetParty={partyName}
          />
        )}

        {error && step !== 'processing' && step !== 'results' && (
            <div className="max-w-3xl mx-auto mt-4 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 text-center">
                {error}
            </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-slate-400 text-sm">
          &copy; {new Date().getFullYear()} TermTrace Contract Analyzer. Powered by Google Gemini.
        </div>
      </footer>
    </div>
  );
};

export default App;