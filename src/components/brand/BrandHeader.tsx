"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteBrand } from "@/actions/brand";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";

interface Props {
  brandId: string;
  brandName: string;
  isSuperAdmin: boolean;
}

export default function BrandHeader({ brandId, brandName, isSuperAdmin }: Props) {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  async function handleDelete() {
    if (confirmText !== brandName) return;
    setLoading(true);
    await deleteBrand(brandId);
    setLoading(false);
    setShowConfirm(false);
    router.push("/");
    router.refresh();
  }

  if (!isSuperAdmin) return null;

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
        title="Delete Brand"
      >
        <Trash2 size={18} />
      </button>

      <Modal
        isOpen={showConfirm}
        onClose={() => {
          setShowConfirm(false);
          setConfirmText("");
        }}
        title="Delete Brand"
      >
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800 font-medium mb-1">
              This action is irreversible!
            </p>
            <p className="text-sm text-red-600">
              All boards, cards, comments, attachments, and uploaded files in{" "}
              <strong>{brandName}</strong> will be permanently deleted.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type <strong>{brandName}</strong> to confirm
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={brandName}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              onClick={() => {
                setShowConfirm(false);
                setConfirmText("");
              }}
            >
              Cancel
            </Button>
            <button
              onClick={handleDelete}
              disabled={confirmText !== brandName || loading}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Deleting..." : "Delete Brand"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
