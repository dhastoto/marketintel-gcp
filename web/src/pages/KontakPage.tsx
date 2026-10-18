import { useState } from "react";
import { z } from "zod";
import { Mail, MessageCircle, MapPin, Clock, Linkedin, Instagram, Loader2, CheckCircle2 } from "lucide-react";
import { SEOHead } from "@/components/SEOHead";
import { PublicLayout } from "@/components/PublicLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

const SUBJECTS = [
  "Pertanyaan Umum",
  "Masalah Teknis",
  "Kerjasama & Partnership",
  "Saran & Masukan",
  "Lainnya",
] as const;

const contactSchema = z.object({
  name: z.string().trim().min(2, "Nama minimal 2 karakter").max(100, "Nama maksimal 100 karakter"),
  email: z.string().trim().email("Email tidak valid").max(255),
  subject: z.enum(SUBJECTS, { errorMap: () => ({ message: "Pilih subjek" }) }),
  message: z.string().trim().min(10, "Pesan minimal 10 karakter").max(2000, "Pesan maksimal 2000 karakter"),
});

const WA_NUMBER = "+6282125461534"; // ganti dengan nomor WA Business
const WA_LINK = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent("Halo MarketIntel, saya ingin bertanya tentang...")}`;
const SUPPORT_EMAIL = "support@marketintel.id";

const faqs = [
  {
    q: "Berapa lama waktu respons?",
    a: "Email dan WhatsApp kami balas dalam 1×24 jam kerja (Senin–Jumat). Untuk masalah teknis mendesak, WhatsApp biasanya lebih cepat.",
  },
  {
    q: "Apakah MarketIntel menerima kerjasama?",
    a: 'Ya! Kami terbuka untuk kerjasama dengan komunitas UMKM, inkubator bisnis, lembaga pendidikan, dan media. Pilih subjek "Kerjasama & Partnership" di form atau hubungi kami via email.',
  },
  {
    q: "Saya mengalami masalah teknis, bagaimana cara melapor?",
    a: 'Pilih subjek "Masalah Teknis" di form di atas, atau kirim pesan via WhatsApp dengan menyertakan screenshot masalah yang Anda alami. Kami akan bantu secepatnya.',
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "ContactPage",
  name: "Hubungi MarketIntel",
  url: "https://marketintel.id/kontak",
};

export default function KontakPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState<string>("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = contactSchema.safeParse({ name, email, subject, message });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("contact_messages").insert({
      name: parsed.data.name,
      email: parsed.data.email,
      subject: parsed.data.subject,
      message: parsed.data.message,
    });
    setSubmitting(false);
    if (error) {
      toast.error("Maaf, pesan gagal terkirim. Silakan coba lagi atau hubungi via WhatsApp.");
      return;
    }
    setDone(true);
    setName("");
    setEmail("");
    setSubject("");
    setMessage("");
    toast.success("Pesan terkirim! Kami akan membalas dalam 1×24 jam kerja.");
  };

  return (
    <PublicLayout>
      <SEOHead
        title="Hubungi Kami — MarketIntel"
        description="Hubungi tim MarketIntel untuk pertanyaan, dukungan teknis, atau kerjasama. Email, WhatsApp, atau isi form — kami balas dalam 1×24 jam kerja."
        canonical="/kontak"
        jsonLd={jsonLd}
      />
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-12 max-w-2xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Hubungi Kami</h1>
          <p className="text-muted-foreground text-lg">
            Ada pertanyaan, masukan, atau ingin kerja sama? Kami senang mendengar dari Anda.
          </p>
        </div>

        {/* Form + Info */}
        <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr] max-w-6xl mx-auto">
          {/* Info Kontak — di atas pada mobile */}
          <div className="lg:order-2 order-1">
            <div className="rounded-xl border bg-card p-6 space-y-6">
              <ContactItem
                icon={<Mail className="h-5 w-5 text-primary" />}
                title="Email"
                primary={
                  <a
                    href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Pertanyaan tentang MarketIntel")}`}
                    className="hover:underline"
                  >
                    {SUPPORT_EMAIL}
                  </a>
                }
                hint="Untuk pertanyaan umum dan dukungan teknis"
              />
              <hr className="border-border" />
              <ContactItem
                icon={<MessageCircle className="h-5 w-5 text-[#25D366]" />}
                title="WhatsApp"
                primary={<span>+6282125461534</span>}
                hint="Respons tercepat untuk pertanyaan singkat"
                action={
                  <Button asChild size="sm" className="bg-[#25D366] hover:bg-[#1ebe5d] text-white mt-2">
                    <a href={WA_LINK} target="_blank" rel="noopener noreferrer">
                      Chat via WhatsApp →
                    </a>
                  </Button>
                }
              />
              <hr className="border-border" />
              <ContactItem
                icon={<MapPin className="h-5 w-5 text-primary" />}
                title="Lokasi"
                primary={<span>Kota Tangerang, Banten</span>}
                hint="Indonesia"
              />
              <hr className="border-border" />
              <ContactItem
                icon={<Clock className="h-5 w-5 text-primary" />}
                title="Jam Layanan"
                primary={<span>Senin – Jumat, 09:00 – 17:00 WIB</span>}
                hint="WhatsApp dibalas maksimal 1×24 jam kerja"
              />
              <hr className="border-border" />
              <div>
                <h3 className="font-semibold mb-3 text-sm">Ikuti Kami</h3>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <a href="https://www.linkedin.com/company/114703962" target="_blank" rel="noopener noreferrer">
                      <Linkedin className="h-4 w-4" /> LinkedIn
                    </a>
                  </Button>
                  {/* <Button variant="outline" size="sm" asChild>
                    <a href="https://instagram.com" target="_blank" rel="noopener noreferrer">
                      <Instagram className="h-4 w-4" /> Instagram
                    </a>
                  </Button>*/}
                </div>
              </div>
            </div>
          </div>

          {/* Form — di bawah pada mobile */}
          <div className="lg:order-1 order-2">
            <div className="rounded-xl border bg-card p-6">
              <h2 className="text-xl font-semibold mb-4">Kirim Pesan</h2>
              {done ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <CheckCircle2 className="h-14 w-14 text-green-500 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Pesan Anda terkirim!</h3>
                  <p className="text-muted-foreground mb-6">Kami akan membalas dalam 1×24 jam kerja.</p>
                  <Button variant="outline" onClick={() => setDone(false)}>
                    Kirim pesan lagi
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nama Lengkap</Label>
                    <Input
                      id="name"
                      placeholder="Nama Anda"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      maxLength={100}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="email@contoh.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      maxLength={255}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="subject">Subjek</Label>
                    <Select value={subject} onValueChange={setSubject}>
                      <SelectTrigger id="subject">
                        <SelectValue placeholder="Pilih subjek..." />
                      </SelectTrigger>
                      <SelectContent>
                        {SUBJECTS.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="message">Pesan</Label>
                    <Textarea
                      id="message"
                      placeholder="Tuliskan pesan Anda di sini..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={5}
                      maxLength={2000}
                      required
                    />
                    <p className="text-xs text-muted-foreground text-right">{message.length}/2000</p>
                  </div>
                  <Button type="submit" disabled={submitting} className="w-full">
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Mengirim...
                      </>
                    ) : (
                      "Kirim Pesan"
                    )}
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* FAQ Mini */}
        <div className="max-w-3xl mx-auto mt-16">
          <h2 className="text-2xl font-bold text-center mb-6">Pertanyaan yang Sering Diajukan</h2>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((f, i) => (
              <AccordionItem key={i} value={`q-${i}`}>
                <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          <div className="text-center mt-6">
            <Button variant="link" asChild>
              <Link to="/faq">Lihat semua FAQ →</Link>
            </Button>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}

function ContactItem({
  icon,
  title,
  primary,
  hint,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  primary: React.ReactNode;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <div className="shrink-0 mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-sm mb-1">{title}</h3>
        <div className="text-foreground">{primary}</div>
        {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
        {action}
      </div>
    </div>
  );
}
