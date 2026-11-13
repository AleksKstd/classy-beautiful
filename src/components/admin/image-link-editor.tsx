"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateCarouselImageDetails } from "@/app/actions/admin/carousel";

export interface ProcedureOption {
  id: string;
  name: string;
  type: string;
}

interface ImageLinkEditorProps {
  imageId: string;
  procedureId: string | null;
  caption: string | null;
  procedures: ProcedureOption[];
}

/** Lets the admin link a photo to a procedure and give it a caption. */
export function ImageLinkEditor({ imageId, procedureId, caption, procedures }: ImageLinkEditorProps) {
  const [selected, setSelected] = useState(procedureId ?? "");
  const [text, setText] = useState(caption ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const dirty = selected !== (procedureId ?? "") || text !== (caption ?? "");

  const byType = procedures.reduce<Record<string, ProcedureOption[]>>((acc, p) => {
    (acc[p.type] ??= []).push(p);
    return acc;
  }, {});

  const save = async () => {
    setSaving(true);
    const result = await updateCarouselImageDetails(imageId, { procedureId: selected || null, caption: text });
    setSaving(false);
    if (result.success) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } else {
      alert(result.error || "Грешка при запазване");
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-xs font-medium text-gray-600">
        Процедура на снимката
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-2 py-2 text-sm"
        >
          <option value="">- без връзка -</option>
          {Object.entries(byType).map(([type, options]) => (
            <optgroup key={type} label={type}>
              {options.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>
      <label className="block text-xs font-medium text-gray-600">
        Надпис (по избор)
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={120}
          placeholder="напр. Резултат след 3 процедури"
          className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-2 text-sm"
        />
      </label>
      <Button size="sm" variant="outline" onClick={save} disabled={!dirty || saving} className="w-full">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : "Запази връзката"}
      </Button>
    </div>
  );
}
