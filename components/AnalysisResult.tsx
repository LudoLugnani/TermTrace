import React, { useState } from 'react';
import { ContractAnalysis } from '../types';
import { Calendar, Clock, AlertTriangle, RefreshCw, FileText, ChevronRight, Info, Download } from 'lucide-react';

interface AnalysisResultProps {
  data: ContractAnalysis;
  targetParty: string;
}

type Tab = 'obligations' | 'deadlines' | 'renewal' | 'calendar';

const AnalysisResult: React.FC<AnalysisResultProps> = ({ data, targetParty }) => {
  const [activeTab, setActiveTab] = useState<Tab>('obligations');

  const exportICS = () => {
    let icsContent = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//ContractAnalyzer//EN\n";
    
    data.calendar_feed.forEach(event => {
      icsContent += "BEGIN:VEVENT\n";
      icsContent += `SUMMARY:${event.event_title}\n`;
      icsContent += `DESCRIPTION:${event.event_description} (Rule: ${event.date_or_rule}) - Ref: ${event.related_clause}\n`;
      // For a real app, we would parse date_or_rule to DTSTART, but since it can be a rule, we skip detailed date parsing for this demo 
      // or set a placeholder if it's not a strict date.
      // A robust implementation would use a library to parse extracted dates.
      icsContent += "END:VEVENT\n";
    });
    
    icsContent += "END:VCALENDAR";

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'obligations.ics');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportJSON = () => {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'analysis_result.json');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Analysis for <span className="text-indigo-600">{targetParty}</span></h2>
          <p className="text-sm text-slate-500 mt-1">Found {data.obligations.length} obligations and {data.deadlines.length} key deadlines.</p>
        </div>
        <div className="flex gap-2">
            <button onClick={exportJSON} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
                <FileText className="w-4 h-4" />
                Export JSON
            </button>
            <button onClick={exportICS} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors">
                <Download className="w-4 h-4" />
                Export iCal
            </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto gap-2 pb-2">
        {[
          { id: 'obligations', label: 'Obligations', icon: AlertTriangle },
          { id: 'deadlines', label: 'Key Deadlines', icon: Clock },
          { id: 'renewal', label: 'Renewal & Termination', icon: RefreshCw },
          { id: 'calendar', label: 'Calendar Feed', icon: Calendar },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-medium text-sm whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-indigo-900 text-white shadow-md'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content Area */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 min-h-[400px]">
        
        {/* OBLIGATIONS TAB */}
        {activeTab === 'obligations' && (
          <div className="overflow-hidden">
            <div className="grid grid-cols-12 gap-4 p-4 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <div className="col-span-1">Ref</div>
              <div className="col-span-3">Summary</div>
              <div className="col-span-4">Original Text</div>
              <div className="col-span-2">Type</div>
              <div className="col-span-2">Deadline/Dep</div>
            </div>
            <div className="divide-y divide-slate-100">
              {data.obligations.length === 0 ? (
                <div className="p-8 text-center text-slate-500">No obligations found for this party.</div>
              ) : (
                data.obligations.map((obl, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-4 p-4 hover:bg-slate-50 transition-colors text-sm">
                    <div className="col-span-1 font-mono text-xs text-slate-500 bg-slate-100 h-fit w-fit px-2 py-1 rounded">{obl.clause_reference}</div>
                    <div className="col-span-3 font-medium text-slate-800">{obl.summary}</div>
                    <div className="col-span-4 text-slate-500 italic text-xs leading-relaxed border-l-2 border-slate-200 pl-3">"{obl.original_text}"</div>
                    <div className="col-span-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize
                            ${obl.type === 'ongoing' ? 'bg-blue-100 text-blue-800' : 
                              obl.type === 'one-off' ? 'bg-purple-100 text-purple-800' :
                              obl.type === 'recurring' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
                            {obl.type}
                        </span>
                    </div>
                    <div className="col-span-2 text-slate-600 text-xs">
                        {obl.deadline && <div className="mb-1"><strong>Due:</strong> {obl.deadline}</div>}
                        {obl.dependencies && <div className="text-slate-400">Dep: {obl.dependencies}</div>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* DEADLINES TAB */}
        {activeTab === 'deadlines' && (
           <div className="overflow-hidden">
           <div className="grid grid-cols-12 gap-4 p-4 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
             <div className="col-span-2">Type</div>
             <div className="col-span-2">Value/Date</div>
             <div className="col-span-4">Explanation</div>
             <div className="col-span-4">Original Text</div>
           </div>
           <div className="divide-y divide-slate-100">
             {data.deadlines.length === 0 ? (
               <div className="p-8 text-center text-slate-500">No specific deadlines identified.</div>
             ) : (
               data.deadlines.map((dl, idx) => (
                 <div key={idx} className="grid grid-cols-12 gap-4 p-4 hover:bg-slate-50 transition-colors text-sm items-center">
                   <div className="col-span-2">
                     <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize
                       ${dl.deadline_type === 'fixed_date' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>
                       {dl.deadline_type.replace('_', ' ')}
                     </span>
                   </div>
                   <div className="col-span-2 font-mono text-slate-700 font-semibold">{dl.converted_date || dl.value}</div>
                   <div className="col-span-4 text-slate-600">{dl.explanation}</div>
                   <div className="col-span-4 text-slate-400 text-xs italic">"{dl.original_text}"</div>
                 </div>
               ))
             )}
           </div>
         </div>
        )}

        {/* RENEWAL TAB */}
        {activeTab === 'renewal' && (
          <div className="p-8 grid md:grid-cols-2 gap-8">
            <div className="space-y-6">
                <div className="bg-slate-50 p-6 rounded-lg border border-slate-200">
                    <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                        <RefreshCw className="w-5 h-5 text-indigo-600" />
                        Term & Renewal
                    </h3>
                    <div className="space-y-4">
                        <div>
                            <div className="text-xs text-slate-500 uppercase tracking-wider font-bold">Term Length</div>
                            <div className="text-slate-800 mt-1 font-medium">{data.renewal_termination.term_length || "Not specified"}</div>
                        </div>
                        <div>
                            <div className="text-xs text-slate-500 uppercase tracking-wider font-bold">Auto-Renewal</div>
                            <div className="text-slate-800 mt-1">{data.renewal_termination.auto_renewal || "Not specified"}</div>
                        </div>
                        <div>
                            <div className="text-xs text-slate-500 uppercase tracking-wider font-bold">Renewal Conditions</div>
                            <div className="text-slate-800 mt-1 text-sm">{data.renewal_termination.renewal_conditions || "None"}</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                 <div className="bg-slate-50 p-6 rounded-lg border border-slate-200 h-full">
                    <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                        Termination Rights
                    </h3>
                    <div className="space-y-4">
                        {data.renewal_termination.termination_rights.length === 0 ? (
                            <p className="text-slate-500 text-sm">No specific termination rights found.</p>
                        ) : (
                            data.renewal_termination.termination_rights.map((right, i) => (
                                <div key={i} className="bg-white p-4 rounded border border-slate-200 shadow-sm">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="font-semibold text-slate-800 text-sm">{right.type}</span>
                                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">Ref: {right.clause_reference}</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 mb-2">
                                        <div><span className="font-bold">Notice:</span> {right.notice_period}</div>
                                        <div><span className="font-bold">Method:</span> {right.method}</div>
                                    </div>
                                    <div className="text-xs text-slate-400 italic">"{right.original_text}"</div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
          </div>
        )}

        {/* CALENDAR TAB */}
        {activeTab === 'calendar' && (
          <div className="p-4">
            <div className="space-y-4">
                {data.calendar_feed.length === 0 ? (
                    <div className="p-8 text-center text-slate-500">No calendar events generated.</div>
                ) : (
                    data.calendar_feed.map((evt, idx) => (
                        <div key={idx} className="flex gap-4 group">
                            <div className="w-24 shrink-0 flex flex-col items-center justify-center bg-indigo-50 rounded-lg p-2 border border-indigo-100 h-20">
                                <Calendar className="w-5 h-5 text-indigo-600 mb-1" />
                                <span className="text-[10px] text-center font-medium text-indigo-800 leading-tight line-clamp-2">{evt.date_or_rule}</span>
                            </div>
                            <div className="flex-1 bg-white border border-slate-200 rounded-lg p-4 group-hover:border-indigo-200 transition-colors shadow-sm">
                                <div className="flex justify-between items-start">
                                    <h4 className="font-semibold text-slate-800">{evt.event_title}</h4>
                                    <span className="text-xs text-slate-400 bg-slate-50 px-2 py-1 rounded">Ref: {evt.related_clause}</span>
                                </div>
                                <p className="text-sm text-slate-600 mt-1">{evt.event_description}</p>
                            </div>
                        </div>
                    ))
                )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalysisResult;
