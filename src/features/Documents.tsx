import { FileLock2, FileText, Plane, Pencil, ShieldCheck, Ticket, Hotel, FileQuestion, Trash2, Upload, MoreVertical, ExternalLink } from "lucide-react";
import { useState } from "react";
import { Badge, Button, Card, EmptyState, ErrorState, Field, SectionHeader, formInputClass, formTextareaClass, formSelectClass, Modal, OptionChips } from "../components/ui";
import { deleteDocument, upsertDocument, getDocumentUrl } from "../lib/supabase";
import type { AppData, DocumentCategory, DocumentInput, TravelDocument } from "../types";

const documentCategories: DocumentCategory[] = ["flight_ticket", "hotel_booking", "passport", "insurance", "attraction_ticket", "other"];

function DocumentCategoryIcon({ category }: { category: string }) {
  const cls = "h-6 w-6 text-white";
  if (category === "flight_ticket") return <Plane className={cls} />;
  if (category === "hotel_booking") return <Hotel className={cls} />;
  if (category === "passport") return <ShieldCheck className={cls} />;
  if (category === "insurance") return <ShieldCheck className={cls} />;
  if (category === "attraction_ticket") return <Ticket className={cls} />;
  return <FileQuestion className={cls} />;
}

const DOC_CATEGORY_STYLE: Record<string, string> = {
  flight_ticket: "bg-gradient-to-br from-sky-400 to-sky-600",
  hotel_booking: "bg-gradient-to-br from-indigo-400 to-indigo-600",
  passport: "bg-gradient-to-br from-teal-400 to-teal-600",
  insurance: "bg-gradient-to-br from-emerald-400 to-emerald-600",
  attraction_ticket: "bg-gradient-to-br from-amber-400 to-orange-500",
  other: "bg-gradient-to-br from-slate-400 to-slate-600",
};

function isImageFile(fileName: string, fileType: string): boolean {
  const fType = fileType.toLowerCase();
  const fName = fileName.toLowerCase();
  return (
    fType.startsWith("image/") ||
    fName.endsWith(".png") ||
    fName.endsWith(".jpg") ||
    fName.endsWith(".jpeg") ||
    fName.endsWith(".webp") ||
    fName.endsWith(".gif")
  );
}

function isPdfFile(fileName: string, fileType: string): boolean {
  const fType = fileType.toLowerCase();
  const fName = fileName.toLowerCase();
  return fType === "application/pdf" || fName.endsWith(".pdf");
}

export function Documents({ data, canEdit = false, onRefresh }: { data: AppData; canEdit?: boolean; onRefresh?: () => Promise<void> }) {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-6 pb-6">
      <SectionHeader
        title="Documents Vault"
        eyebrow="Tickets, passports, insurance"
        action={canEdit ? (
          <Button onClick={() => setShowForm((value) => !value)}>
            <Upload className="h-4 w-4" aria-hidden="true" />
            Upload
          </Button>
        ) : null}
      />
      {canEdit ? <DocumentForm isOpen={showForm} data={data} onCancel={() => setShowForm(false)} onSaved={async () => { setShowForm(false); await onRefresh?.(); }} /> : null}

      {/* Security notice */}
      <div className="flex items-start gap-3 rounded-[20px] bg-clay-recessed shadow-clay-pressed p-4 sm:p-5">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
        <p className="text-sm font-medium text-amber-700 leading-relaxed">
          Sensitive documents should be protected. Store only what the family needs, mark private files carefully, and keep RLS policies enabled.
        </p>
      </div>

      {data.documents.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-10 w-10 opacity-80" />}
          title="Empty travel wallet"
          body="Upload PDFs or images for tickets, bookings, passports, insurance, and attraction passes."
          action={canEdit ? <Button variant="secondary" onClick={() => setShowForm(true)}>Add to travel wallet</Button> : null}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {data.documents.map((document) => (
            <DocumentCard key={document.id} data={data} document={document} canEdit={canEdit} onRefresh={onRefresh} />
          ))}
        </div>
      )}
    </div>
  );
}

function DocumentCard({ data, document, canEdit, onRefresh }: { data: AppData; document: TravelDocument; canEdit: boolean; onRefresh?: () => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const ActionMenu = () => {
    if (!canEdit) return null;
    return (
      <div className="absolute top-4 right-4 z-[80]">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-clay-surface text-clay-secondary hover:bg-clay-recessed hover:text-clay-primary active:scale-90 transition-all shadow-clay-card"
          aria-label="Actions"
        >
          <MoreVertical className="h-5 w-5" />
        </button>

        {menuOpen && (
          <>
            {/* Click-outside backdrop */}
            <div
              className="fixed inset-0 z-[70] bg-transparent"
              onClick={(e) => { e.stopPropagation(); setMenuOpen(false); }}
            />
            
            {/* Menu overlay */}
            <div className="absolute right-0 top-11 z-[90] min-w-[120px] rounded-[20px] bg-clay-surface p-2 shadow-clay-card border border-border/40 flex flex-col gap-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(false);
                  setEditing(true);
                }}
                className="flex w-full items-center gap-2 px-3.5 py-2 text-xs font-bold text-clay-secondary hover:bg-clay-recessed hover:text-clay-primary rounded-[12px] transition-colors text-left"
              >
                <Pencil className="h-3.5 w-3.5" /> Edit
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(false);
                  void remove();
                }}
                className="flex w-full items-center gap-2 px-3.5 py-2 text-xs font-bold text-danger hover:bg-danger/10 rounded-[12px] transition-colors text-left"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
            </div>
          </>
        )}
      </div>
    );
  };

  async function remove() {
    if (!window.confirm("Delete this document?")) return;
    setBusy(true);
    setError(null);
    try {
      await deleteDocument(data.trip.id, document.id, document.storagePath);
      await onRefresh?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete document.");
    } finally {
      setBusy(false);
    }
  }

  const styleClass = DOC_CATEGORY_STYLE[document.category] ?? DOC_CATEGORY_STYLE.other;

  return (
    <>
      <Card className={`relative p-5 sm:p-6 border-0 bg-clay-surface rounded-[32px] shadow-clay-card hover:shadow-clay-hover hover:-translate-y-1 transition-all group ${menuOpen ? "z-50" : "z-0"}`}>
        <ActionMenu />
        {/* Document wallet subtle top border */}
        <div className="absolute top-0 left-0 right-0 h-1.5 rounded-t-[32px] bg-gradient-to-r from-slate-200 to-slate-300" />
        
        <div className="flex flex-col sm:flex-row items-start gap-4">
          {/* Category icon */}
          <div className={`shrink-0 flex h-14 w-14 items-center justify-center rounded-[20px] shadow-clay-btn ${styleClass}`}>
            {document.isPrivate
              ? <FileLock2 className="h-6 w-6 text-white" aria-hidden="true" />
              : <DocumentCategoryIcon category={document.category} />
            }
          </div>
          <div className="min-w-0 flex-1 w-full">
            <h3 className="break-words font-black text-lg text-clay-primary leading-tight pr-8">{document.fileName}</h3>
            <p className="mt-1 text-xs font-bold text-clay-secondary truncate uppercase tracking-wider pr-8">{document.fileType}</p>
            
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="inline-flex items-center rounded-[12px] bg-clay-recessed shadow-clay-pressed px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-clay-secondary">
                {document.category.replace(/_/g, " ")}
              </span>
              {document.isPrivate ? (
                <Badge tone="red" className="shadow-sm">Private</Badge>
              ) : (
                <Badge tone="slate" className="shadow-sm">Shared</Badge>
              )}
            </div>

            {document.storagePath && isImageFile(document.fileName, document.fileType) && (
              <div className="mt-4 overflow-hidden rounded-[16px] border border-border/40 bg-clay-recessed shadow-clay-pressed max-h-48 flex items-center justify-center">
                <img
                  src={getDocumentUrl(document.storagePath)}
                  alt={document.fileName}
                  className="w-full h-full object-cover max-h-48 hover:scale-105 transition-all cursor-pointer"
                  onClick={() => setViewerOpen(true)}
                />
              </div>
            )}

            {document.storagePath ? (
              <div className="mt-4 flex flex-wrap gap-2 pt-2 border-t border-border/40">
                <Button
                  variant="ghost"
                  className="h-9 text-xs font-bold uppercase tracking-wider text-primary bg-primary/5 hover:bg-primary/15"
                  onClick={() => setViewerOpen(true)}
                >
                  <ExternalLink className="h-3.5 w-3.5 mr-1" /> View File
                </Button>
              </div>
            ) : null}

            {error ? <p className="mt-3 text-sm font-bold text-danger">{error}</p> : null}
          </div>
        </div>
      </Card>
      {canEdit && (
        <DocumentForm isOpen={editing} data={data} document={document} onCancel={() => setEditing(false)} onSaved={async () => { setEditing(false); await onRefresh?.(); }} />
      )}
      {viewerOpen && document.storagePath && (
        <DocumentViewerModal
          isOpen={viewerOpen}
          onClose={() => setViewerOpen(false)}
          document={document}
          url={getDocumentUrl(document.storagePath)}
        />
      )}
    </>
  );
}

function DocumentForm({ isOpen, data, document, onSaved, onCancel }: { isOpen: boolean; data: AppData; document?: TravelDocument; onSaved: () => Promise<void>; onCancel: () => void }) {
  const [form, setForm] = useState<DocumentInput>({
    fileName: document?.fileName ?? "",
    fileType: document?.fileType ?? "application/pdf",
    category: document?.category ?? "other",
    itineraryItemId: document?.itineraryItemId,
    isPrivate: document?.isPrivate ?? false,
    file: null
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof DocumentInput>(key: K, value: DocumentInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!form.fileName.trim()) {
      setError("File name is required.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await upsertDocument(data.trip.id, { ...form, fileName: form.fileName.trim(), fileType: form.fileType.trim() || "application/octet-stream" }, document?.id);
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save document.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={document ? "Edit Document" : "Upload Document"}>
      <form className="grid gap-3 md:grid-cols-2" onSubmit={save}>
        <Field label="File name"><input className={formInputClass} value={form.fileName} onChange={(event) => update("fileName", event.target.value)} /></Field>
        <Field label="File type"><input className={formInputClass} value={form.fileType} onChange={(event) => update("fileType", event.target.value)} /></Field>
        <div className="md:col-span-2">
          <Field label="Category">
            <OptionChips
              options={documentCategories.map((category) => ({ value: category, label: category.replace(/_/g, " ") }))}
              value={form.category}
              onChange={(v) => update("category", v)}
            />
          </Field>
        </div>
        <Field label="Linked itinerary item">
          <select className={formSelectClass} value={form.itineraryItemId ?? ""} onChange={(event) => update("itineraryItemId", event.target.value || undefined)}>
            <option value="">None</option>{data.itinerary.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
          </select>
        </Field>
        <Field label="Upload file">
          <input
            type="file"
            className={`${formInputClass} py-2`}
            onChange={(event) => {
              const file = event.target.files?.[0] ?? null;
              update("file", file);
              if (file) {
                update("fileName", file.name);
                update("fileType", file.type || "application/octet-stream");
              }
            }}
          />
        </Field>
        <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-[16px] bg-clay-recessed shadow-clay-pressed px-4 text-sm font-bold text-clay-primary hover:bg-primary/5 transition-colors mt-6">
          <input type="checkbox" className="h-4 w-4 accent-primary rounded" checked={form.isPrivate} onChange={(event) => update("isPrivate", event.target.checked)} />
          Private document
        </label>
        {error ? <div className="md:col-span-2"><ErrorState message={error} /></div> : null}
        <div className="flex gap-2 md:col-span-2 pt-4">
          <Button type="button" variant="ghost" disabled={busy} onClick={onCancel}>Cancel</Button>
          <Button type="submit" disabled={busy}>Save</Button>
        </div>
      </form>
    </Modal>
  );
}

function DocumentViewerModal({
  isOpen,
  onClose,
  document,
  url,
}: {
  isOpen: boolean;
  onClose: () => void;
  document: TravelDocument;
  url: string;
}) {
  const isImage = isImageFile(document.fileName, document.fileType);
  const isPdf = isPdfFile(document.fileName, document.fileType);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={document.fileName}>
      {isImage ? (
        <div className="flex flex-col items-center gap-4">
          <div className="relative overflow-hidden rounded-[24px] bg-clay-recessed shadow-clay-pressed border border-border/40 p-2 max-h-[60vh] w-full flex items-center justify-center">
            <img
              src={url}
              alt={document.fileName}
              className="max-h-[55vh] object-contain rounded-[16px] w-full"
            />
          </div>
          <div className="flex w-full justify-between items-center gap-2">
            <span className="text-xs font-bold text-clay-secondary truncate max-w-[50%]">
              {document.fileName}
            </span>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[12px] bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold transition-all"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Open in New Tab
            </a>
          </div>
        </div>
      ) : isPdf ? (
        <div className="flex flex-col items-center gap-4">
          <div className="w-full h-[60vh] rounded-[24px] overflow-hidden bg-clay-recessed shadow-clay-pressed border border-border/40">
            <iframe
              src={url}
              title={document.fileName}
              className="w-full h-full border-0"
            />
          </div>
          <div className="flex w-full justify-between items-center gap-2">
            <span className="text-xs font-bold text-clay-secondary truncate max-w-[50%]">
              {document.fileName}
            </span>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[12px] bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold transition-all"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Open PDF
            </a>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-8 gap-4 rounded-[24px] bg-clay-recessed shadow-clay-pressed border border-border/40 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-clay-surface text-clay-secondary shadow-clay-card">
            <FileText className="h-8 w-8 text-clay-secondary" />
          </div>
          <div>
            <h4 className="font-black text-lg text-clay-primary">{document.fileName}</h4>
            <p className="text-xs font-bold text-clay-secondary mt-1 uppercase tracking-wider">{document.fileType}</p>
          </div>
          <p className="text-sm font-medium text-clay-secondary max-w-xs leading-relaxed">
            This file type cannot be previewed inline. Please open or download it to view.
          </p>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[16px] bg-primary text-white hover:bg-primary-dark text-sm font-bold transition-all shadow-clay-btn hover:scale-[1.02] active:scale-95"
          >
            <ExternalLink className="h-4 w-4" /> Open File
          </a>
        </div>
      )}
    </Modal>
  );
}
