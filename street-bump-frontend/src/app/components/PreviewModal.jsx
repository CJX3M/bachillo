'use client';

import { Dialog } from '@headlessui/react';
import { XMarkIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';
import LocationDisplay from './LocationDisplay';
import MapPicker from './MapPicker';

export default function PreviewModal({
  isOpen,
  onClose,
  imageFile,
  location,
  onLocationSelect,
  onSubmit,
  loading
}) {
  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      className="relative z-50"
    >
      {/* Modal content */}
    </Dialog>
  );
}