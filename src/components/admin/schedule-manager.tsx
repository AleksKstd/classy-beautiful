"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Loader2 } from "lucide-react";
import {
  createScheduleClosure,
  deleteScheduleClosure,
} from "@/app/actions/admin";
import { format, parseISO } from "date-fns";
import { bg } from "date-fns/locale";
import type { Schedule } from "@/types/database";

interface ScheduleManagerProps {
  schedules: Schedule[];
}

export function ScheduleManager({ schedules: initialSchedules }: ScheduleManagerProps) {
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    office_name: "София" as "София" | "Лом",
    closed_date_start: "",
    closed_date_end: "",
  });

  const resetForm = () => {
    setFormData({
      office_name: "София",
      closed_date_start: "",
      closed_date_end: "",
    });
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const startDate = new Date(formData.closed_date_start);
    const endDate = new Date(formData.closed_date_end);

    if (endDate <= startDate) {
      alert("Крайната дата трябва да е след началната");
      setLoading(false);
      return;
    }

    const result = await createScheduleClosure({
      office_name: formData.office_name,
      closed_date_start: startDate.toISOString(),
      closed_date_end: endDate.toISOString(),
    });

    setLoading(false);

    if (result.success) {
      resetForm();
      window.location.reload();
    } else {
      alert(result.error || "Грешка");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Сигурни ли сте, че искате да изтриете това затваряне?")) {
      return;
    }

    const result = await deleteScheduleClosure(id);
    if (result.success) {
      window.location.reload();
    } else {
      alert(result.error || "Грешка при изтриване");
    }
  };

  const groupedSchedules = initialSchedules.reduce((acc, schedule) => {
    if (!acc[schedule.office_name]) acc[schedule.office_name] = [];
    acc[schedule.office_name].push(schedule);
    return acc;
  }, {} as Record<string, Schedule[]>);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-xl sm:text-2xl font-bold">Управление на график</h2>
        <Button onClick={() => setShowForm(!showForm)} className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Затвори период
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Затваряне на салон</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="office">Офис *</Label>
                <select
                  id="office"
                  value={formData.office_name}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      office_name: e.target.value as "София" | "Лом",
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold"
                  required
                >
                  <option value="София">София</option>
                  <option value="Лом">Лом</option>
                </select>
              </div>

              <div>
                <Label htmlFor="start_date">Начална дата *</Label>
                <Input
                  id="start_date"
                  type="datetime-local"
                  value={formData.closed_date_start}
                  onChange={(e) =>
                    setFormData({ ...formData, closed_date_start: e.target.value })
                  }
                  required
                />
              </div>

              <div>
                <Label htmlFor="end_date">Крайна дата *</Label>
                <Input
                  id="end_date"
                  type="datetime-local"
                  value={formData.closed_date_end}
                  onChange={(e) =>
                    setFormData({ ...formData, closed_date_end: e.target.value })
                  }
                  required
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

      {/* Schedules List */}
      {Object.keys(groupedSchedules).length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border border-gray-200">
          <p className="text-gray-500">Няма затворени периоди</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedSchedules).map(([office, schedules]) => (
            <div
              key={office}
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-200"
            >
              <h3 className="text-lg font-semibold mb-4">{office}</h3>
              <div className="space-y-3">
                {schedules.map((schedule) => {
                  const startDate = parseISO(schedule.closed_date_start);
                  const endDate = parseISO(schedule.closed_date_end);
                  const isPast = endDate < new Date();

                  return (
                    <div
                      key={schedule.id}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border gap-3 ${
                        isPast ? "border-gray-300 bg-gray-50" : "border-gray-200"
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-sm sm:text-base">
                            {format(startDate, "d MMM yyyy, HH:mm", { locale: bg })}
                            {" → "}
                            {format(endDate, "d MMM yyyy, HH:mm", { locale: bg })}
                          </p>
                          {isPast && (
                            <span className="bg-gray-200 text-gray-600 text-xs font-semibold px-2 py-1 rounded">
                              Минал
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          Създаден: {format(parseISO(schedule.created_at), "d MMM yyyy", { locale: bg })}
                        </p>
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(schedule.id)}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Забележка:</strong> Затворените периоди блокират резервации за избрания офис.
          Използвайте това за празници, ремонти или други случаи, когато салонът е затворен.
        </p>
      </div>
    </div>
  );
}
