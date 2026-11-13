"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Settings, 
  Mail, 
  Bell, 
  Calendar, 
  QrCode, 
  Check, 
  Loader2,
  ExternalLink,
  Copy,
  CheckCircle2,
  Info
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface CalendarFeedInfo {
  feedUrl: string;
  googleUrl: string;
  qrDataUrl: string;
}

interface AdminSettingsProps {
  adminEmail: string;
  notificationEnabled: boolean;
  onSave: (settings: { adminEmail: string; notificationEnabled: boolean }) => Promise<{ success: boolean; error?: string }>;
  /** null when CALENDAR_FEED_TOKEN is not configured on the server */
  calendarFeed: CalendarFeedInfo | null;
}

export function AdminSettings({ 
  adminEmail: initialEmail, 
  notificationEnabled: initialEnabled,
  onSave,
  calendarFeed,
}: AdminSettingsProps) {
  const [adminEmail, setAdminEmail] = useState(initialEmail);
  const [notificationEnabled, setNotificationEnabled] = useState(initialEnabled);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  // Private ICS feed (protected by a secret token) that Google Calendar can subscribe to
  const calendarFeedUrl = calendarFeed?.feedUrl ?? "";
  const googleCalendarSubscribeUrl = calendarFeed?.googleUrl ?? "";

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await onSave({ adminEmail, notificationEnabled });
      if (!result.success) {
        alert(result.error || "Грешка при запазване");
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center">
          <Settings className="w-5 h-5 text-gold" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Настройки</h2>
          <p className="text-sm text-gray-500">Имейл известия и Google Calendar</p>
        </div>
      </div>

      {/* Email Notifications Section */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
            <Mail className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold">Имейл известия</h3>
            <p className="text-sm text-gray-500">Получавайте имейл при нова резервация</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="adminEmail">Имейл на администратора</Label>
            <Input
              id="adminEmail"
              type="email"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              placeholder="admin@example.com"
              className="mt-1"
            />
            <p className="text-xs text-gray-500 mt-1">
              На този имейл ще получавате известия за нови резервации
            </p>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center gap-3">
              <Bell className={cn("w-5 h-5", notificationEnabled ? "text-green-500" : "text-gray-400")} />
              <div>
                <p className="font-medium">Известия за нови резервации</p>
                <p className="text-sm text-gray-500">
                  {notificationEnabled ? "Включени" : "Изключени"}
                </p>
              </div>
            </div>
            <button
              onClick={() => setNotificationEnabled(!notificationEnabled)}
              className={cn(
                "relative w-12 h-6 rounded-full transition-colors",
                notificationEnabled ? "bg-green-500" : "bg-gray-300"
              )}
            >
              <div
                className={cn(
                  "absolute top-1 w-4 h-4 bg-white rounded-full transition-transform",
                  notificationEnabled ? "translate-x-7" : "translate-x-1"
                )}
              />
            </button>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : saved ? (
              <Check className="w-4 h-4 mr-2" />
            ) : null}
            {saved ? "Запазено!" : "Запази настройките"}
          </Button>
        </div>

        {/* Info box about email setup */}
        <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
          <div className="flex gap-3">
            <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-700">
              <p className="font-medium mb-1">Как работят имейл известията?</p>
              <ul className="list-disc list-inside space-y-1 text-blue-600">
                <li>При нова резервация получавате имейл с детайлите</li>
                <li>Когато потвърдите резервация, клиентът получава имейл</li>
                <li>Изисква се RESEND_API_KEY в .env.local файла</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Google Calendar Section */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
            <Calendar className="w-4 h-4 text-green-600" />
          </div>
          <div>
            <h3 className="font-semibold">Google Calendar интеграция</h3>
            <p className="text-sm text-gray-500">Синхронизирайте резервациите с вашия календар</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* QR Code for easy mobile setup */}
          <div className="flex flex-col items-center p-6 bg-gray-50 rounded-xl">
            <div className="flex items-center gap-2 mb-4">
              <QrCode className="w-5 h-5 text-gold" />
              <span className="font-medium">Сканирайте с телефона</span>
            </div>
            
            {/* QR code is generated on the server, so the secret feed URL never leaves the site */}
            <div className="bg-white p-4 rounded-xl shadow-sm mb-4">
              {calendarFeed ? (
                // eslint-disable-next-line @next/next/no-img-element -- data: URL, nothing to optimise
                <img
                  src={calendarFeed.qrDataUrl}
                  alt="QR код за Google Calendar"
                  className="w-48 h-48"
                />
              ) : (
                <div className="w-48 h-48 flex items-center justify-center text-center text-sm text-gray-500">
                  Задайте CALENDAR_FEED_TOKEN на сървъра
                </div>
              )}
            </div>
            
            <p className="text-sm text-gray-500 text-center max-w-xs">
              Сканирайте QR кода с телефона си за да добавите календара автоматично
            </p>
          </div>

          {/* Manual subscription link */}
          <div className="space-y-3">
            <Label>Или добавете ръчно:</Label>
            
            <div className="flex gap-2">
              <Input 
                value={calendarFeedUrl} 
                readOnly 
                className="font-mono text-sm"
              />
              <Button
                variant="outline"
                disabled={!calendarFeed}
                onClick={() => copyToClipboard(calendarFeedUrl)}
                className="flex-shrink-0"
              >
                {copied ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>

            <Button
              variant="outline"
              className="w-full"
              disabled={!calendarFeed}
              onClick={() => window.open(googleCalendarSubscribeUrl, "_blank", "noopener,noreferrer")}
            >
              <Calendar className="w-4 h-4 mr-2" />
              Отвори в Google Calendar
              <ExternalLink className="w-4 h-4 ml-2" />
            </Button>
          </div>

          {/* Instructions */}
          <div className="p-4 bg-green-50 rounded-xl border border-green-100">
            <div className="flex gap-3">
              <Info className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-green-700">
                <p className="font-medium mb-2">Как да добавите календара в Google Calendar:</p>
                <ol className="list-decimal list-inside space-y-1 text-green-600">
                  <li>Сканирайте QR кода с телефона или натиснете бутона</li>
                  <li>Google Calendar ще ви попита дали да добавите календара</li>
                  <li>Потвърдете и резервациите ще се показват автоматично</li>
                  <li>Календарът се обновява автоматично на всеки час</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
