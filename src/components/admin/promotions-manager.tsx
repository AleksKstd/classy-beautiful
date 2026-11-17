"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Edit, Eye, EyeOff, Loader2, Plus, Search, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createPromotion, deletePromotion, setPromotionActive, updatePromotion } from "@/app/actions/admin/promotions";
import { PROMOTION_KINDS, defaultBadge, isPromotionLive, offerProceduresLabel, promotionOffer, validUntilLabel } from "@/lib/promotions";
import { toDateKey } from "@/lib/time";
import { cn, formatDuration, formatPrice } from "@/lib/utils";
import type { Procedure, Promotion, PromotionKind } from "@/types/database";

interface PromotionsManagerProps {
  promotions: Promotion[];
  procedures: Procedure[];
}

interface FormState {
  kind: PromotionKind;
  title: string;
  badge: string;
  /** True once the admin typed their own label; until then it follows the kind. */
  badgeEdited: boolean;
  description: string;
  procedureIds: string[];
  count: string;
  price: string;
  startsOn: string;
  endsOn: string;
  isActive: boolean;
}

const emptyForm: FormState = {
  kind: "bundle",
  title: "",
  badge: "Оферта",
  badgeEdited: false,
  description: "",
  procedureIds: [],
  count: "5",
  price: "",
  startsOn: "",
  endsOn: "",
  isActive: true,
};

function formFrom(promotion: Promotion): FormState {
  return {
    kind: promotion.kind,
    title: promotion.title,
    badge: promotion.badge,
    badgeEdited: promotion.badge !== defaultBadge(promotion.kind, promotion.procedure_count, promotion.price),
    description: promotion.description ?? "",
    procedureIds: promotion.procedure_ids,
    count: String(promotion.procedure_count ?? 5),
    price: promotion.price !== null ? String(promotion.price) : "",
    startsOn: promotion.starts_on ?? "",
    endsOn: promotion.ends_on ?? "",
    isActive: promotion.is_active,
  };
}

function statusOf(promotion: Promotion): { label: string; className: string } {
  if (!promotion.is_active) return { label: "Скрита", className: "bg-taupe-200 text-taupe-700" };
  if (isPromotionLive(promotion)) return { label: "Активна", className: "bg-green-100 text-green-800" };
  const today = toDateKey(new Date());
  if (promotion.starts_on && promotion.starts_on > today) return { label: "Предстои", className: "bg-blush text-rose-dark" };
  return { label: "Изтекла", className: "bg-taupe-200 text-taupe-700" };
}

export function PromotionsManager({ promotions, procedures }: PromotionsManagerProps) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [pickerQuery, setPickerQuery] = useState("");
  const [isPending, startTransition] = useTransition();

  const procedureById = useMemo(() => new Map(procedures.map((p) => [p.id, p])), [procedures]);
  const update = (patch: Partial<FormState>) => setForm((prev) => ({ ...prev, ...patch }));

  // The label follows the kind and counts until the admin writes their own.
  const withBadge = (next: FormState): FormState =>
    next.badgeEdited ? next : { ...next, badge: defaultBadge(next.kind, Number(next.count), next.price === "" ? null : Number(next.price)) };

  const openNew = () => {
    setForm(emptyForm);
    setEditingId("new");
    setError(null);
    setPickerQuery("");
  };

  const openEdit = (promotion: Promotion) => {
    setForm(formFrom(promotion));
    setEditingId(promotion.id);
    setError(null);
    setPickerQuery("");
  };

  const close = () => {
    setEditingId(null);
    setError(null);
  };

  const toggleProcedure = (id: string) => {
    setForm((prev) => {
      const selected = prev.procedureIds.includes(id);
      return { ...prev, procedureIds: selected ? prev.procedureIds.filter((x) => x !== id) : [...prev.procedureIds, id] };
    });
  };

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const input = {
      kind: form.kind,
      title: form.title,
      badge: form.badge,
      description: form.description || null,
      procedure_ids: form.procedureIds,
      procedure_count: form.kind === "bundle" ? Number(form.count) : null,
      price: form.price !== "" ? Number(form.price) : null,
      starts_on: form.startsOn || null,
      ends_on: form.endsOn || null,
      is_active: form.isActive,
    };
    startTransition(async () => {
      const result = editingId === "new" ? await createPromotion(input) : await updatePromotion(editingId!, input);
      if (result.success) {
        close();
        router.refresh();
      } else {
        setError(result.error ?? "Грешка при запазване");
      }
    });
  };

  const toggleActive = (promotion: Promotion) => {
    startTransition(async () => {
      const result = await setPromotionActive(promotion.id, !promotion.is_active);
      if (result.success) router.refresh();
      else alert(result.error ?? "Грешка");
    });
  };

  const remove = (promotion: Promotion) => {
    if (!confirm(`Да изтрия ли промоцията „${promotion.title}“? Направените с нея резервации остават.`)) return;
    startTransition(async () => {
      const result = await deletePromotion(promotion.id);
      if (result.success) router.refresh();
      else alert(result.error ?? "Грешка при изтриване");
    });
  };

  // Live preview of what clients will see
  const preview = useMemo(() => {
    const draft: Promotion = {
      id: "preview",
      kind: form.kind,
      title: form.title || "Заглавие",
      badge: form.badge,
      description: form.description || null,
      procedure_ids: form.procedureIds,
      procedure_count: Number(form.count) || null,
      price: form.price !== "" ? Number(form.price) : null,
      starts_on: form.startsOn || null,
      ends_on: form.endsOn || null,
      is_active: true,
      display_order: 0,
      created_at: "",
    };
    return promotionOffer(draft, procedures);
  }, [form, procedures]);

  const pickerWords = pickerQuery.trim().toLocaleLowerCase("bg").split(/\s+/).filter(Boolean);
  const pickerResults = procedures
    .filter((p) => p.is_active)
    .filter((p) => {
      if (!pickerWords.length) return true;
      const text = `${p.name} ${p.type}`.toLocaleLowerCase("bg");
      return pickerWords.every((w) => text.includes(w));
    })
    .slice(0, 40);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-bold sm:text-2xl">Промоции</h2>
          <p className="mt-1 text-sm text-taupe-600">
            Специални оферти: определен брой процедури на обща цена, пакет от процедури или друга оферта. Показват се на началната страница и в резервациите.
          </p>
        </div>
        {editingId === null && (
          <Button onClick={openNew} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Нова промоция
          </Button>
        )}
      </div>

      {editingId !== null && (
        <form onSubmit={save} className="space-y-6 rounded-2xl border border-taupe-200 bg-white p-4 shadow-sm sm:p-6">
          <h3 className="text-lg font-semibold">{editingId === "new" ? "Нова промоция" : "Редактиране на промоция"}</h3>

          {/* Kind */}
          <fieldset>
            <legend className="mb-2 text-sm font-medium">Вид *</legend>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {PROMOTION_KINDS.map(({ kind, label, hint }) => (
                <label
                  key={kind}
                  className={cn(
                    "cursor-pointer rounded-md border p-3 transition-colors",
                    form.kind === kind ? "border-cocoa bg-champagne" : "border-taupe-200 hover:border-cocoa/40"
                  )}
                >
                  <input
                    type="radio"
                    name="kind"
                    value={kind}
                    checked={form.kind === kind}
                    onChange={() =>
                      setForm((prev) => withBadge({ ...prev, kind }))
                    }
                    className="sr-only"
                  />
                  <span className="block font-medium">{label}</span>
                  <span className="mt-0.5 block text-xs text-taupe-600">{hint}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_12rem]">
            <div>
              <Label htmlFor="promo-title">Заглавие *</Label>
              <Input
                id="promo-title"
                value={form.title}
                onChange={(e) => update({ title: e.target.value })}
                placeholder="напр. 5 процедури лазерна епилация"
                maxLength={120}
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="promo-badge">Етикет *</Label>
              <Input
                id="promo-badge"
                value={form.badge}
                onChange={(e) => update({ badge: e.target.value, badgeEdited: true })}
                maxLength={30}
                required
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="promo-description">Описание</Label>
            <textarea
              id="promo-description"
              value={form.description}
              onChange={(e) => update({ description: e.target.value })}
              rows={3}
              maxLength={600}
              placeholder="Кратко за клиента: какво включва, условия…"
              className="mt-1 w-full resize-none rounded-md border border-taupe-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gold"
            />
          </div>

          {/* Kind-specific fields */}
          <div className="grid grid-cols-1 gap-4 sm:max-w-md sm:grid-cols-2 sm:items-end">
            {form.kind === "bundle" && (
              <div>
                <Label htmlFor="promo-count">Брой процедури *</Label>
                <Input
                  id="promo-count"
                  type="number"
                  min={2}
                  max={20}
                  value={form.count}
                  onChange={(e) => setForm((prev) => withBadge({ ...prev, count: e.target.value }))}
                  required
                  className="mt-1"
                />
              </div>
            )}
            <div>
              <Label htmlFor="promo-price">
                {form.kind === "bundle"
                  ? "Обща цена (€) *"
                  : form.kind === "package"
                    ? "Цена на пакета (€) *"
                    : "Цена (€), по желание"}
              </Label>
              <Input
                id="promo-price"
                type="number"
                min={0}
                step="0.01"
                value={form.price}
                onChange={(e) => setForm((prev) => withBadge({ ...prev, price: e.target.value }))}
                required={form.kind !== "custom"}
                className="mt-1"
              />
            </div>
          </div>
          {form.kind === "bundle" && (
            <p className="-mt-3 text-xs text-taupe-500">
              Клиентът плаща {form.price || "…"} € за {form.count || "…"} процедури. Онлайн запазва само първото посещение
              (ако изберете няколко процедури, избира с коя да започне). Останалите посещения добавяте от Резервации → Нова резервация.
            </p>
          )}

          {/* Procedures */}
          <div>
            <p className="mb-2 text-sm font-medium">
              {form.kind === "bundle"
                ? "Процедури, от които клиентът избира *"
                : form.kind === "package"
                  ? "Процедури в пакета * (в реда, в който се правят)"
                  : "Процедури *"}
            </p>
            {form.procedureIds.length > 0 && (
              <ol className="mb-3 space-y-1.5">
                {form.procedureIds.map((id, index) => {
                  const procedure = procedureById.get(id);
                  return (
                    <li key={id} className="flex items-center gap-3 rounded-md bg-champagne px-3 py-2 text-sm">
                      <span className="text-taupe-500">{index + 1}.</span>
                      <span className="flex-1">
                        <span className="block">
                          {procedure?.name ?? "Изтрита процедура"}
                          {procedure && !procedure.is_active && <span className="ml-2 text-xs text-taupe-500">(неактивна)</span>}
                        </span>
                        {procedure && <span className="block text-xs text-taupe-500">{procedure.type}</span>}
                      </span>
                      {procedure && <span className="text-taupe-600">{formatPrice(procedure.price)}</span>}
                      <button
                        type="button"
                        onClick={() => toggleProcedure(id)}
                        className="p-1 text-taupe-500 hover:text-red-700"
                        aria-label={`Премахни ${procedure?.name ?? "процедурата"}`}
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </li>
                  );
                })}
              </ol>
            )}
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-taupe-400" aria-hidden="true" />
              <input
                type="search"
                value={pickerQuery}
                onChange={(e) => setPickerQuery(e.target.value)}
                placeholder="Търсете процедура за добавяне…"
                aria-label="Търсене на процедура за промоцията"
                className="[&::-webkit-search-cancel-button]:appearance-none h-11 w-full rounded-md border border-taupe-200 bg-white pl-9 pr-3 text-sm placeholder:text-taupe-400 focus:border-cocoa focus:outline-none focus:ring-2 focus:ring-gold/30"
              />
            </div>
            <ul className="mt-2 max-h-64 divide-y divide-taupe-100 overflow-y-auto rounded-md border border-taupe-200">
              {pickerResults.map((procedure) => {
                const selected = form.procedureIds.includes(procedure.id);
                return (
                  <li key={procedure.id}>
                    <button
                      type="button"
                      onClick={() => toggleProcedure(procedure.id)}
                      aria-pressed={selected}
                      className={cn(
                        "flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm transition-colors",
                        selected ? "bg-champagne" : "hover:bg-taupe-100"
                      )}
                    >
                      <span>
                        <span className="block">{procedure.name}</span>
                        <span className="block text-xs text-taupe-500">
                          {procedure.type} · {formatDuration(procedure.duration_minutes)}
                        </span>
                      </span>
                      <span className="shrink-0 text-taupe-600">{selected ? "Избрана" : formatPrice(procedure.price)}</span>
                    </button>
                  </li>
                );
              })}
              {pickerResults.length === 0 && <li className="px-3 py-3 text-sm text-taupe-500">Няма намерени процедури.</li>}
            </ul>
          </div>

          {/* Dates and visibility */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:items-end">
            <div>
              <Label htmlFor="promo-start">От дата</Label>
              <Input id="promo-start" type="date" value={form.startsOn} onChange={(e) => update({ startsOn: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="promo-end">До дата</Label>
              <Input id="promo-end" type="date" value={form.endsOn} onChange={(e) => update({ endsOn: e.target.value })} className="mt-1" />
            </div>
            <label className="flex h-12 items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => update({ isActive: e.target.checked })}
                className="h-4 w-4 accent-cocoa"
              />
              Показвай на сайта
            </label>
          </div>
          <p className="-mt-3 text-xs text-taupe-500">Без дати промоцията важи, докато не я скриете.</p>

          {/* Preview */}
          <div className="rounded-md border border-dashed border-gold/60 bg-ivory p-4 text-sm">
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-taupe-500">Как ще изглежда за клиента</p>
            {preview ? (
              <p>
                <span className="mr-2 rounded bg-gold px-2 py-0.5 text-xs font-semibold text-cocoa">{form.badge}</span>
                <strong>{form.title || "Заглавие"}</strong>
                {" - "}
                {preview.regularPrice > preview.totalPrice && (
                  <span className="mr-1 text-taupe-500 line-through">{formatPrice(preview.regularPrice)}</span>
                )}
                <strong>{formatPrice(preview.totalPrice)}</strong>
                {preview.priceNote && <span className="text-taupe-600"> ({preview.priceNote})</span>}
                <span className="text-taupe-600">
                  {" · "}
                  {preview.choice ? "по избор: " : ""}
                  {preview.procedures.map((p) => p.name).join(preview.choice ? ", " : " + ")}
                  {!preview.choice && ` · посещение ${formatDuration(preview.durationMinutes)}`}
                </span>
              </p>
            ) : (
              <p className="text-taupe-500">Изберете процедура, за да видите цената.</p>
            )}
          </div>

          {error && <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}

          <div className="flex flex-col-reverse gap-3 border-t border-taupe-200 pt-6 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={close} disabled={isPending} className="w-full px-6 sm:w-auto">
              Отказ
            </Button>
            <Button type="submit" disabled={isPending} className="w-full px-6 sm:w-auto">
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingId === "new" ? "Създай промоцията" : "Запази промените"}
            </Button>
          </div>
        </form>
      )}

      {/* List */}
      {promotions.length === 0 && editingId === null ? (
        <div className="rounded-2xl border border-dashed border-taupe-300 bg-white p-10 text-center text-taupe-600">
          Още няма промоции. Създайте първата, например „5 процедури за 80 €“ на лазерна епилация.
        </div>
      ) : (
        <ul className="space-y-3">
          {promotions.map((promotion) => {
            const status = statusOf(promotion);
            const offer = promotionOffer({ ...promotion, is_active: true }, procedures);
            const until = validUntilLabel(promotion);
            return (
              <li key={promotion.id} className="flex flex-col gap-3 rounded-xl border border-taupe-200 bg-white p-4 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-gold px-2 py-0.5 text-xs font-semibold text-cocoa">{promotion.badge}</span>
                    <h3 className="font-medium">{promotion.title}</h3>
                    <span className={cn("rounded px-2 py-0.5 text-xs font-semibold", status.className)}>{status.label}</span>
                  </div>
                  <p className="mt-1 text-sm text-taupe-600">
                    {offer ? offerProceduresLabel(offer) : "Процедурите вече не са налични"}
                    {offer && (
                      <>
                        {" · "}
                        <strong className="text-cocoa">{formatPrice(offer.totalPrice)}</strong>
                        {offer.priceNote && ` (${offer.priceNote})`}
                      </>
                    )}
                    {until && ` · ${until}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-center">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toggleActive(promotion)}
                    disabled={isPending}
                    aria-label={promotion.is_active ? "Скрий от сайта" : "Покажи на сайта"}
                    title={promotion.is_active ? "Скрий от сайта" : "Покажи на сайта"}
                  >
                    {promotion.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => openEdit(promotion)} disabled={isPending} aria-label="Редактирай">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => remove(promotion)} disabled={isPending} aria-label="Изтрий">
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
