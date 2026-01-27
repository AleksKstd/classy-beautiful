"use client";

import { useState } from "react";
import { adminLogin } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, User, Loader2 } from "lucide-react";

export default function AdminLoginPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError("");

    const result = await adminLogin(formData);

    if (!result.success) {
      setError(result.error || "Грешка при вход");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-gold/10 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-gold" aria-hidden="true" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Админ панел</h1>
            <p className="text-gray-600">Classy & Beautiful</p>
          </div>

          <form action={handleSubmit}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="username">Потребителско име</Label>
                <div className="relative mt-1">
                  <User
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                    aria-hidden="true"
                  />
                  <Input
                    id="username"
                    name="username"
                    type="text"
                    required
                    className="pl-10"
                    placeholder="Въведете потребителско име"
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="password">Парола</Label>
                <div className="relative mt-1">
                  <Lock
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                    aria-hidden="true"
                  />
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    required
                    className="pl-10"
                    placeholder="Въведете парола"
                    disabled={loading}
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Вход...
                  </>
                ) : (
                  "ВХОД"
                )}
              </Button>
            </div>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          Само за администратори
        </p>
      </div>
    </div>
  );
}
