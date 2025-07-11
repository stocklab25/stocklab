'use client';

import { useState, useEffect } from 'react';
import Modal from './Modal';
import Button from './Button';
import Input from './Input';

interface FormData {
  [key: string]: string | number;
}

interface EditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: FormData) => Promise<void>;
  title: string;
  fields: {
    name: string;
    label: string;
    type: 'text' | 'number' | 'email' | 'password';
    value: string | number;
    placeholder?: string;
    min?: number;
    max?: number;
    required?: boolean;
  }[];
  isLoading?: boolean;
}

export function EditModal({
  isOpen,
  onClose,
  onSave,
  title,
  fields,
  isLoading = false,
}: EditModalProps) {
  const [formData, setFormData] = useState<FormData>({});
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Initialize form data when modal opens
  useEffect(() => {
    if (isOpen) {
      const initialFormData: FormData = {};
      fields.forEach(field => {
        initialFormData[field.name] = field.value;
      });
      setFormData(initialFormData);
      setErrors({});
    }
  }, [isOpen, fields]);

  const handleInputChange = (name: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
    
    fields.forEach(field => {
      const value = formData[field.name];
      
      if (field.required && (!value || value === '')) {
        newErrors[field.name] = `${field.label} is required`;
      } else if (field.type === 'number') {
        const numValue = Number(value);
        if (isNaN(numValue)) {
          newErrors[field.name] = `${field.label} must be a valid number`;
        } else if (field.min !== undefined && numValue < field.min) {
          newErrors[field.name] = `${field.label} must be at least ${field.min}`;
        } else if (field.max !== undefined && numValue > field.max) {
          newErrors[field.name] = `${field.label} must be at most ${field.max}`;
        }
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      await onSave(formData);
      onClose();
    } catch (err) {
      // Handle error - you might want to show a toast or set a general error
      
    }
  };

  return (
    <Modal open={isOpen} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold mb-4">{title}</h2>
        </div>

        <div className="space-y-4">
          {fields.map((field) => (
            <div key={field.name}>
              <label htmlFor={field.name} className="block text-sm font-medium text-gray-700 mb-2">
                {field.label}
              </label>
              <Input
                id={field.name}
                type={field.type}
                value={formData[field.name] || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                  handleInputChange(field.name, field.type === 'number' ? Number(e.target.value) : e.target.value)
                }
                placeholder={field.placeholder}
                min={field.min}
                max={field.max}
                className="w-full"
              />
              {errors[field.name] && (
                <p className="text-sm text-red-600 mt-1">{errors[field.name]}</p>
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isLoading}
          >
            {isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </Modal>
  );
} 
