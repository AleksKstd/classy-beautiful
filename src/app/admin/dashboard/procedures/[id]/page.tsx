"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import Link from "next/link";
import { updateProcedure, deleteProcedure } from "@/app/actions/admin";

interface EditProcedurePageProps {
  params: { id: string };
}

export default function EditProcedurePage({ params }: EditProcedurePageProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    duration_minutes: "",
    price: "",
    type: "",
    technician: "",
    discount_percentage: "",
  });

  useEffect(() => {
    // Fetch the procedure data
    const fetchProcedure = async () => {
      try {
        const response = await fetch(`/api/procedures/${params.id}`);
        if (!response.ok) throw new Error("Процедурата не е намерена");
        const data = await response.json();
        setFormData({
          name: data.name || "",
          description: data.description || "",
          duration_minutes: data.duration_minutes?.toString() || "",
          price: data.price?.toString() || "",
          type: data.type || "",
          technician: data.technician || "",
          discount_percentage: data.discount_percentage?.toString() || "",
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Грешка при зареждане");
      } finally {
        setLoading(false);
      }
    };

    fetchProcedure();
  }, [params.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const data = {
        name: formData.name,
        description: formData.description || null,
        duration_minutes: parseInt(formData.duration_minutes),
        price: parseFloat(formData.price),
        type: formData.type,
        technician: formData.technician,
        discount_percentage: formData.discount_percentage
          ? parseFloat(formData.discount_percentage)
          : null,
      };

      const result = await updateProcedure(params.id, data);

      if (result.success) {
        router.push("/admin/dashboard");
        router.refresh();
      } else {
        setError(result.error || "Грешка при запазване");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Грешка при запазване");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Сигурни ли сте, че искате да изтриете тази процедура?")) {
      return;
    }

    setDeleting(true);
    setError(null);

    try {
      const result = await deleteProcedure(params.id);

      if (result.success) {
        router.push("/admin/dashboard");
        router.refresh();
      } else {
        setError(result.error || "Грешка при изтриване");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Грешка при изтриване");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gold" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/admin/dashboard"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gold transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Назад към панела
          </Link>
          <h1 className="text-2xl font-bold">Редактиране на процедура</h1>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 space-y-6">
          <div>
            <Label htmlFor="name">Име на процедурата *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="description">Описание</Label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold resize-none"
              placeholder="Подробно описание на процедурата..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="type">Категория *</Label>
              <Input
                id="type"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                required
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="technician">Специалист *</Label>
              <Input
                id="technician"
                value={formData.technician}
                onChange={(e) => setFormData({ ...formData, technician: e.target.value })}
                required
                className="mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="duration">Продължителност (мин) *</Label>
              <Input
                id="duration"
                type="number"
                value={formData.duration_minutes}
                onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                required
                min="1"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="price">Цена (EUR) *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                required
                min="0"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="discount">Отстъпка (%)</Label>
              <Input
                id="discount"
                type="number"
                step="0.01"
                value={formData.discount_percentage}
                onChange={(e) => setFormData({ ...formData, discount_percentage: e.target.value })}
                min="0"
                max="100"
                className="mt-1"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleDelete}
              disabled={deleting}
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Изтриване...
                </>
              ) : (
                "Изтрий процедурата"
              )}
            </Button>

            <div className="flex gap-3">
              <Button type="button" variant="outline" asChild>
                <Link href="/admin/dashboard">Отказ</Link>
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Запазване...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Запази промените
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
