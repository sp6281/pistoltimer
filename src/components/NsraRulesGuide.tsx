import React from 'react';
import { X, Shield, Clock, Crosshair, AlertTriangle, Check, BookOpen } from 'lucide-react';

interface NsraRulesGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NsraRulesGuide: React.FC<NsraRulesGuideProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">NSRA &amp; ISSF Rapid Fire Pistol Rules</h2>
              <p className="text-xs text-slate-400">
                Standard Pistol 10-Second Series Specifications &amp; Official Commands
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content sections */}
        <div className="space-y-6 text-sm text-slate-300">
          {/* 1. Discipline Overview */}
          <div>
            <h3 className="text-base font-semibold text-white flex items-center gap-2 mb-2">
              <Crosshair className="w-4 h-4 text-emerald-400" />
              <span>1. Discipline &amp; Course of Fire</span>
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              In NSRA (National Small-bore Rifle Association, UK) and ISSF Standard Pistol competitions, the match includes rapid fire series of <strong>5 shots in 10 seconds</strong> on standard turning targets or electronic targets at 20 yards, 25 yards, or 25 metres.
            </p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
              <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                <div className="text-slate-500 text-[10px]">Pistol Calibre</div>
                <div className="font-semibold text-slate-200 mt-0.5">.22 LR Rimfire</div>
              </div>
              <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                <div className="text-slate-500 text-[10px]">Trigger Weight</div>
                <div className="font-semibold text-slate-200 mt-0.5">Min 1000 grams</div>
              </div>
              <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                <div className="text-slate-500 text-[10px]">Series Format</div>
                <div className="font-semibold text-slate-200 mt-0.5">5 shots / 10.0 sec</div>
              </div>
            </div>
          </div>

          {/* 2. Official Command Sequence */}
          <div>
            <h3 className="text-base font-semibold text-white flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span>2. Official Range Commands &amp; Timing</span>
            </h3>

            <div className="space-y-3">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80">
                <div className="flex items-center justify-between text-xs font-semibold text-amber-400 mb-1">
                  <span>1. Preparation &amp; Loading: &quot;LOAD&quot;</span>
                  <span className="font-mono text-slate-400">60 Seconds</span>
                </div>
                <p className="text-xs text-slate-400">
                  Range Officer commands <em>&quot;LOAD&quot;</em>. Shooters have exactly 60 seconds (1 minute) to load a magazine with 5 rounds, charge the chamber, establish their stance, and prepare for the series. At 50 seconds, a <em>&quot;10 SECONDS&quot;</em> call warns that prep time is ending.
                </p>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80">
                <div className="flex items-center justify-between text-xs font-semibold text-red-400 mb-1">
                  <span>2. Ready Command: &quot;ATTENTION&quot;</span>
                  <span className="font-mono text-slate-400">7.0 Seconds Delay</span>
                </div>
                <p className="text-xs text-slate-400">
                  Targets turn to edge (or red lights show). Range Officer commands <em>&quot;ATTENTION&quot;</em>. Shooters immediately assume the official <strong>45-degree READY position</strong>. Exactly 7.0 seconds elapse before the start signal.
                </p>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80">
                <div className="flex items-center justify-between text-xs font-semibold text-emerald-400 mb-1">
                  <span>3. Firing Period: Start Horn &amp; Green Light</span>
                  <span className="font-mono text-slate-400">10.00 Seconds</span>
                </div>
                <p className="text-xs text-slate-400">
                  Targets rotate face-on and green light illuminates simultaneously with a sharp acoustic start horn. Shooters raise pistol from the 45-degree position and discharge 5 shots within the 10.00-second window.
                </p>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80">
                <div className="flex items-center justify-between text-xs font-semibold text-rose-400 mb-1">
                  <span>4. Cease Fire: Stop Horn &amp; &quot;STOP, UNLOAD&quot;</span>
                  <span className="font-mono text-slate-400">Immediate</span>
                </div>
                <p className="text-xs text-slate-400">
                  At 10.00 seconds (+0.2s target turn tolerance), targets edge away, red light illuminates, and dual-tone stop buzzer sounds. RO commands <em>&quot;STOP. UNLOAD. MAKE SAFE.&quot;</em> (or <em>&quot;STOP, UNLOAD AND SHOW CLEAR&quot;</em>). Any shot fired after the signal counts as a miss.
                </p>
              </div>
            </div>
          </div>

          {/* 3. The 45-Degree Ready Position (Rule 8.7.6.2) */}
          <div>
            <h3 className="text-base font-semibold text-white flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>3. The 45-Degree Ready Position Rule</span>
            </h3>
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs space-y-2">
              <p className="text-amber-200">
                <strong>Rule Requirement:</strong> The shooter must lower the shooting arm to point towards the ground at an angle of not greater than <strong>45 degrees to the horizontal</strong>.
              </p>
              <ul className="list-disc pl-4 space-y-1 text-slate-400">
                <li>The gun or forearm must not touch or rest on the bench or table.</li>
                <li>The shooter must remain stationary in this ready position until the start signal sounds / targets face.</li>
                <li>Prematurely raising the firearm before the start signal results in a penalty (deduction of 2 points or cancellation of series in competition).</li>
              </ul>
            </div>
          </div>

          {/* 4. Safety & Ear Defenders */}
          <div>
            <h3 className="text-base font-semibold text-white flex items-center gap-2 mb-2">
              <BookOpen className="w-4 h-4 text-emerald-400" />
              <span>4. Audio &amp; Hearing Protection Compliance</span>
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Target pistol shooters wear hearing defenders (passive muffs or active electronic suppression). For this reason, our sound engine produces dual-harmonic competition acoustic horns (1000 Hz + 1250 Hz start horn, 650 Hz dual stop buzzer) calibrated for maximum frequency cut-through, paired with an optional +6dB Ear Defender Boost.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
