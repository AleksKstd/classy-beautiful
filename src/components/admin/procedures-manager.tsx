"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Edit, Trash2, Loader2, ChevronDown, PlusCircle } from "lucide-react";
import {
  createProcedure,
  deleteProcedure,
} from "@/app/actions/admin";
import { formatPrice, formatDuration } from "@/lib/utils";
import type { Procedure } from "@/types/database";

interface ProceduresManagerProps {
  procedures: Procedure[];
}

// Predefined types that exist in the system
const PREDEFINED_TYPES = [
  "Нокти",
  "Вежди",
  "Мигли",
  "Терапии за лице",
  "Естетични процедури - лице",
  "Лазерна епилация - жени",
  "Кола маска - жени",
  "Лазерна епилация - мъже",
  "Кола маска - мъже",
  "Естетични процедури - тяло",
  "Пилинг на тяло",
  "Пресотерапия и лимфендренаж",
];

export function ProceduresManager({ procedures: initialProcedures }: ProceduresManagerProps) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isAddingNewType, setIsAddingNewType] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    duration_minutes: "",
    price: "",
    type: "",
    technician: "",
    discount_percentage: "",
  });

  // Get all unique types from procedures (including custom ones)
  const existingTypes = Array.from(
    new Set([
      ...PREDEFINED_TYPES,
      ...initialProcedures.map(p => p.type)
    ])
  ).sort((a, b) => {
    // Sort predefined first, then custom alphabetically
    const aIndex = PREDEFINED_TYPES.indexOf(a);
    const bIndex = PREDEFINED_TYPES.indexOf(b);
    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    return a.localeCompare(b);
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      duration_minutes: "",
      price: "",
      type: "",
      technician: "",
      discount_percentage: "",
    });
    setIsAddingNewType(false);
    setShowForm(false);
  };

  const handleTypeChange = (value: string) => {
    if (value === "__new__") {
      setIsAddingNewType(true);
      setFormData({ ...formData, type: "" });
    } else {
      setIsAddingNewType(false);
      setFormData({ ...formData, type: value });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const data = {
      name: formData.name,
      description: formData.description || null,
      duration_minutes: parseInt(formData.duration_minutes),
      price: parseFloat(formData.price),
      type: formData.type,
      technician: formData.technician,
      discount_percentage: formData.discount_percentage
        ? parseFloat(formData.discount_percentage)
        : undefined,
    };

    const result = await createProcedure(data);

    setLoading(false);

    if (result.success) {
      resetForm();
      router.refresh();
    } else {
      alert(result.error || "Грешка");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Сигурни ли сте, че искате да изтриете тази процедура?")) {
      return;
    }

    setDeletingId(id);
    
    try {
      const result = await deleteProcedure(id);
      if (result.success) {
        router.refresh();
      } else {
        alert(result.error || "Грешка при изтриване");
      }
    } catch (error) {
      alert("Грешка при изтриване");
    } finally {
      setDeletingId(null);
    }
  };

  const groupedProcedures = initialProcedures.reduce((acc, proc) => {
    if (!acc[proc.type]) acc[proc.type] = [];
    acc[proc.type].push(proc);
    return acc;
  }, {} as Record<string, Procedure[]>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Управление на процедури</h2>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="w-4 h-4 mr-2" />
          Нова процедура
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">
            Добавяне на процедура
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="name">Име *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                  placeholder="Класически маникюр"
                />
              </div>

              <div>
                <Label htmlFor="description">Описание</Label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Подробно описание на процедурата..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold resize-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="type">Категория *</Label>
                {!isAddingNewType ? (
                  <div className="relative">
                    <select
                      id="type"
                      value={formData.type}
                      onChange={(e) => handleTypeChange(e.target.value)}
                      required
                      className="w-full h-10 px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-gold appearance-none cursor-pointer"
                    >
                      <option value="" disabled>Изберете категория...</option>
                      {existingTypes.map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                      <option value="__new__" className="font-semibold text-gold">➕ Добави нова категория...</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Input
                      id="type"
                      value={formData.type}
                      onChange={(e) =>
                        setFormData({ ...formData, type: e.target.value })
                      }
                      required
                      placeholder="Въведете име на нова категория..."
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingNewType(false);
                        setFormData({ ...formData, type: "" });
                      }}
                      className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
                    >
                      ← Обратно към списъка
                    </button>
                    <p className="text-xs text-amber-600">
                      Забележка: Новата категория ще се показва автоматично на сайта.
                    </p>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="duration">Продължителност (минути) *</Label>
                <Input
                  id="duration"
                  type="number"
                  value={formData.duration_minutes}
                  onChange={(e) =>
                    setFormData({ ...formData, duration_minutes: e.target.value })
                  }
                  required
                  min="1"
                  placeholder="45"
                />
              </div>

              <div>
                <Label htmlFor="price">Цена (лв) *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({ ...formData, price: e.target.value })
                  }
                  required
                  min="0"
                  placeholder="25.00"
                />
              </div>

              <div>
                <Label htmlFor="technician">Специалист *</Label>
                <Input
                  id="technician"
                  value={formData.technician}
                  onChange={(e) =>
                    setFormData({ ...formData, technician: e.target.value })
                  }
                  required
                  placeholder="Цвети"
                />
              </div>

              <div>
                <Label htmlFor="discount">Отстъпка (%)</Label>
                <Input
                  id="discount"
                  type="number"
                  step="0.01"
                  value={formData.discount_percentage}
                  onChange={(e) =>
                    setFormData({ ...formData, discount_percentage: e.target.value })
                  }
                  min="0"
                  max="100"
                  placeholder="10"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Запазване...
                  </>
                ) : (
                  "ЗАПАЗИ"
                )}
              </Button>
              <Button type="button" variant="outline" onClick={resetForm}>
                ОТКАЗ
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Procedures List */}
      <div className="space-y-6">
        {Object.entries(groupedProcedures).map(([category, procs]) => (
          <div key={category} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold mb-4">{category}</h3>
            <div className="space-y-3">
              {procs.map((proc) => (
                <div
                  key={proc.id}
                  className={`flex items-center justify-between p-4 rounded-lg border ${
                    proc.is_active ? "border-gray-200" : "border-gray-300 bg-gray-50"
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h4 className="font-medium">{proc.name}</h4>
                      {proc.discount_percentage && proc.discount_percentage > 0 && (
                        <span className="bg-red-100 text-red-600 text-xs font-semibold px-2 py-1 rounded">
                          -{proc.discount_percentage}%
                        </span>
                      )}
                      {!proc.is_active && (
                        <span className="bg-gray-200 text-gray-600 text-xs font-semibold px-2 py-1 rounded">
                          Неактивна
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                      <span>{formatDuration(proc.duration_minutes)}</span>
                      <span>•</span>
                      <span className="font-semibold text-gold">
                        {formatPrice(proc.price)}
                      </span>
                      <span>•</span>
                      <span>{proc.technician}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      asChild
                    >
                      <Link href={`/admin/dashboard/procedures/${proc.id}`}>
                        <Edit className="w-4 h-4" />
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(proc.id)}
                      disabled={deletingId === proc.id}
                    >
                      {deletingId === proc.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4 text-red-600" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
