"use client";

import { PhoneCall, ShieldAlert, Ambulance, Flame, Siren, HeartHandshake } from "lucide-react";

interface SosDialerViewProps {
  daylight: boolean;
}

const EMERGENCY_NUMBERS = [
  {
    label: "All-in-One National Emergency",
    sub: "Police, Fire & Ambulance Dispatch",
    number: "112",
    accent: "bg-red-600 text-white",
    icon: Siren
  },
  {
    label: "Medical Ambulance",
    sub: "24/7 Emergency Medical Transport",
    number: "108",
    accent: "bg-emerald-600 text-white",
    icon: Ambulance
  },
  {
    label: "Disaster Management Control",
    sub: "Floods, Earthquakes, Landslides & Rescue",
    number: "1070",
    accent: "bg-amber-600 text-white",
    icon: ShieldAlert
  },
  {
    label: "Fire & Rescue Services",
    sub: "Fire Brigade & Structural Collapse",
    number: "101",
    accent: "bg-orange-600 text-white",
    icon: Flame
  },
  {
    label: "Women & Child Safety Helpline",
    sub: "24/7 Emergency Assistance",
    number: "181",
    accent: "bg-sky-600 text-white",
    icon: HeartHandshake
  }
];

export function SosDialerView({ daylight }: SosDialerViewProps) {
  return (
    <div className="space-y-3">
      <div
        className={`rounded-2xl border p-4 ${
          daylight
            ? "border-red-200 bg-red-50 text-zinc-950"
            : "border-red-900/50 bg-red-950/30 text-zinc-100"
        }`}
      >
        <h2 className="text-base font-bold text-red-500">
          Immediate Life-Safety Helplines
        </h2>
        <p className="mt-1 text-xs opacity-80">
          In a life-threatening emergency, call official dispatch immediately
          before waiting for community responders. Works without mobile data.
        </p>
      </div>

      <div className="space-y-2.5">
        {EMERGENCY_NUMBERS.map((item) => {
          const Icon = item.icon;
          return (
            <a
              key={item.number}
              href={`tel:${item.number}`}
              className={`flex items-center justify-between gap-3 rounded-2xl border p-4 transition active:scale-[0.99] ${
                daylight
                  ? "border-zinc-200 bg-white text-zinc-950 hover:border-zinc-300"
                  : "border-zinc-800 bg-zinc-900 text-zinc-100 hover:border-zinc-700"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${item.accent}`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{item.label}</p>
                  <p className="truncate text-xs opacity-70">{item.sub}</p>
                </div>
              </div>

              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-sm font-extrabold text-white shadow-xs">
                <PhoneCall className="h-4 w-4" />
                {item.number}
              </span>
            </a>
          );
        })}
      </div>
    </div>
  );
}
