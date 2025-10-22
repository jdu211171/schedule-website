"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface EditableContextValue {
  editing: boolean;
  setEditing: (editing: boolean) => void;
  value: string;
  setValue: (value: string) => void;
  defaultValue: string;
  onSubmit?: (value: string) => void;
  onEdit?: () => void;
  onCancel?: () => void;
  invalid?: boolean;
  required?: boolean;
  readOnly?: boolean;
  disabled?: boolean;
  autosize?: boolean;
  triggerMode?: "click" | "dblclick" | "focus";
  placeholder?: string;
  name?: string;
  id: string;
}

const EditableContext = React.createContext<EditableContextValue | null>(null);

function useEditableContext() {
  const context = React.useContext(EditableContext);
  if (!context) {
    throw new Error("Editable components must be used within EditableRoot");
  }
  return context;
}

interface EditableRootProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onSubmit"> {
  asChild?: boolean;
  invalid?: boolean;
  required?: boolean;
  readOnly?: boolean;
  disabled?: boolean;
  autosize?: boolean;
  triggerMode?: "click" | "dblclick" | "focus";
  placeholder?: string;
  name?: string;
  onSubmit?: (value: string) => void;
  onEdit?: () => void;
  onCancel?: () => void;
  onEscapeKeyDown?: (event: KeyboardEvent) => void;
  onEnterKeyDown?: (event: KeyboardEvent) => void;
  editing?: boolean;
  defaultEditing?: boolean;
  onValueChange?: (value: string) => void;
  value?: string;
  defaultValue?: string;
  id?: string;
}

const EditableRoot = React.forwardRef<HTMLDivElement, EditableRootProps>(
  (
    {
      className,
      asChild = false,
      invalid = false,
      required = false,
      readOnly = false,
      disabled = false,
      autosize = false,
      triggerMode = "click",
      placeholder,
      name,
      onSubmit,
      onEdit,
      onCancel,
      onEscapeKeyDown,
      onEnterKeyDown,
      editing: controlledEditing,
      defaultEditing = false,
      onValueChange,
      value: controlledValue,
      defaultValue = "",
      id: providedId,
      children,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId();
    const id = providedId || generatedId;

    const [internalEditing, setInternalEditing] =
      React.useState(defaultEditing);
    const [internalValue, setInternalValue] = React.useState(
      controlledValue || defaultValue
    );

    const editing =
      controlledEditing !== undefined ? controlledEditing : internalEditing;
    const value =
      controlledValue !== undefined ? controlledValue : internalValue;

    const setEditing = React.useCallback(
      (newEditing: boolean) => {
        if (controlledEditing === undefined) {
          setInternalEditing(newEditing);
        }
        if (newEditing && onEdit) {
          onEdit();
        }
      },
      [controlledEditing, onEdit]
    );

    const setValue = React.useCallback(
      (newValue: string) => {
        if (controlledValue === undefined) {
          setInternalValue(newValue);
        }
        onValueChange?.(newValue);
      },
      [controlledValue, onValueChange]
    );

    React.useEffect(() => {
      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Escape") {
          onEscapeKeyDown?.(event);
          if (editing) {
            setEditing(false);
            setValue(defaultValue);
            onCancel?.();
          }
        }
        if (event.key === "Enter" && event.target instanceof HTMLInputElement) {
          onEnterKeyDown?.(event);
          if (editing) {
            event.preventDefault();
            setEditing(false);
            onSubmit?.(value);
          }
        }
      };

      if (editing) {
        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
      }
    }, [
      editing,
      value,
      defaultValue,
      onEscapeKeyDown,
      onEnterKeyDown,
      onSubmit,
      onCancel,
      setEditing,
      setValue,
    ]);

    const contextValue: EditableContextValue = {
      editing,
      setEditing,
      value,
      setValue,
      defaultValue,
      onSubmit,
      onEdit,
      onCancel,
      invalid,
      required,
      readOnly,
      disabled,
      autosize,
      triggerMode,
      placeholder,
      name,
      id,
    };

    const Comp = asChild ? React.Fragment : "div";
    const compProps = asChild
      ? {}
      : { className: cn("relative", className), ref, ...props };

    return (
      <EditableContext.Provider value={contextValue}>
        <Comp {...compProps}>{children}</Comp>
      </EditableContext.Provider>
    );
  }
);
EditableRoot.displayName = "EditableRoot";

const EditableLabel = React.forwardRef<
  React.ElementRef<typeof Label>,
  React.ComponentPropsWithoutRef<typeof Label> & { asChild?: boolean }
>(({ className, asChild = false, ...props }, ref) => {
  const { disabled, invalid, required, id } = useEditableContext();

  return (
    <Label
      ref={ref}
      className={cn(className)}
      data-disabled={disabled ? "" : undefined}
      data-invalid={invalid ? "" : undefined}
      data-required={required ? "" : undefined}
      htmlFor={id}
      {...props}
    />
  );
});
EditableLabel.displayName = "EditableLabel";

const EditableArea = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { asChild?: boolean }
>(({ className, asChild = false, children, ...props }, ref) => {
  const { disabled, editing } = useEditableContext();

  const Comp = asChild ? React.Fragment : "div";
  const compProps = asChild
    ? {}
    : {
        className: cn("relative w-full", className),
        ref,
        "data-disabled": disabled ? "" : undefined,
        "data-editing": editing ? "" : undefined,
        ...props,
      };

  return <Comp {...compProps}>{children}</Comp>;
});
EditableArea.displayName = "EditableArea";

const EditablePreview = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { asChild?: boolean }
>(({ className, asChild = false, children, onClick, ...props }, ref) => {
  const {
    value,
    disabled,
    readOnly,
    editing,
    placeholder,
    setEditing,
    triggerMode,
  } = useEditableContext();

  if (editing) return null;

  const isEmpty = !value || value.trim() === "";
  const displayValue = isEmpty ? placeholder : value;

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!disabled && !readOnly && triggerMode === "click") {
      e.preventDefault();
      e.stopPropagation();
      setEditing(true);
    }
    onClick?.(e);
  };

  const handleDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!disabled && !readOnly && triggerMode === "dblclick") {
      e.preventDefault();
      e.stopPropagation();
      setEditing(true);
    }
  };

  const Comp = asChild ? React.Fragment : "div";
  const compProps = asChild
    ? {}
    : {
        className: cn(
          "cursor-pointer select-none w-full",
          isEmpty && "text-muted-foreground",
          !disabled && !readOnly && "hover:bg-muted/50 transition-colors",
          className
        ),
        ref,
        onClick: handleClick,
        onDoubleClick: handleDoubleClick,
        "data-empty": isEmpty ? "" : undefined,
        "data-disabled": disabled ? "" : undefined,
        "data-readonly": readOnly ? "" : undefined,
        ...props,
      };

  return <Comp {...compProps}>{children || displayValue}</Comp>;
});
EditablePreview.displayName = "EditablePreview";

const EditableInput = React.forwardRef<
  React.ElementRef<typeof Input>,
  React.ComponentPropsWithoutRef<typeof Input> & { asChild?: boolean }
>(({ className, asChild = false, onBlur, ...props }, ref) => {
  const {
    value,
    setValue,
    editing,
    placeholder,
    name,
    id,
    disabled,
    readOnly,
    autosize,
    onSubmit,
    setEditing,
  } = useEditableContext();

  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useImperativeHandle(ref, () => inputRef.current!, []);

  React.useEffect(() => {
    if (editing && inputRef.current) {
      // Small delay to ensure the input is rendered
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 0);
    }
  }, [editing]);

  if (!editing) return null;

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setEditing(false);
    onSubmit?.(value);
    onBlur?.(e);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      setEditing(false);
      onSubmit?.(value);
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setEditing(false);
    }
  };

  return (
    <Input
      ref={inputRef}
      className={cn(
        "w-full",
        autosize && "resize-none overflow-hidden",
        className
      )}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      name={name}
      id={id}
      disabled={disabled}
      readOnly={readOnly}
      {...props}
    />
  );
});
EditableInput.displayName = "EditableInput";

const EditableTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof Button> & {
    asChild?: boolean;
    forceMount?: boolean;
  }
>(
  (
    { className, asChild = false, forceMount = false, onClick, ...props },
    ref
  ) => {
    const { setEditing, editing, disabled, readOnly, triggerMode } =
      useEditableContext();

    if (editing && !forceMount) return null;

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (triggerMode === "click") {
        setEditing(true);
      }
      onClick?.(e);
    };

    const handleDoubleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (triggerMode === "dblclick") {
        setEditing(true);
      }
    };

    return (
      <Button
        ref={ref}
        className={cn(className)}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        disabled={disabled || readOnly}
        data-disabled={disabled ? "" : undefined}
        data-readonly={readOnly ? "" : undefined}
        {...props}
      />
    );
  }
);
EditableTrigger.displayName = "EditableTrigger";

const EditableToolbar = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    asChild?: boolean;
    orientation?: "horizontal" | "vertical";
  }
>(
  (
    {
      className,
      asChild = false,
      orientation = "horizontal",
      children,
      ...props
    },
    ref
  ) => {
    const { editing } = useEditableContext();

    if (!editing) return null;

    const Comp = asChild ? React.Fragment : "div";
    const compProps = asChild
      ? {}
      : {
          className: cn(
            "flex gap-2 mt-2",
            orientation === "vertical" ? "flex-col" : "flex-row",
            className
          ),
          ref,
          ...props,
        };

    return <Comp {...compProps}>{children}</Comp>;
  }
);
EditableToolbar.displayName = "EditableToolbar";

const EditableSubmit = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof Button> & { asChild?: boolean }
>(({ className, asChild = false, onClick, ...props }, ref) => {
  const { setEditing, value, onSubmit } = useEditableContext();

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    setEditing(false);
    onSubmit?.(value);
    onClick?.(e);
  };

  return (
    <Button
      ref={ref}
      className={cn(className)}
      onClick={handleClick}
      {...props}
    />
  );
});
EditableSubmit.displayName = "EditableSubmit";

const EditableCancel = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof Button> & { asChild?: boolean }
>(({ className, asChild = false, onClick, ...props }, ref) => {
  const { setEditing, setValue, defaultValue, onCancel } = useEditableContext();

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    setEditing(false);
    setValue(defaultValue);
    onCancel?.();
    onClick?.(e);
  };

  return (
    <Button
      ref={ref}
      className={cn(className)}
      onClick={handleClick}
      {...props}
    />
  );
});
EditableCancel.displayName = "EditableCancel";

// Main export for backward compatibility
const Editable = EditableRoot;

export {
  Editable,
  EditableRoot,
  EditableLabel,
  EditableArea,
  EditablePreview,
  EditableInput,
  EditableTrigger,
  EditableToolbar,
  EditableSubmit,
  EditableCancel,
};

// Named exports for composition
export {
  EditableRoot as Root,
  EditableLabel as Label,
  EditableArea as Area,
  EditablePreview as Preview,
  EditableInput as Input,
  EditableTrigger as Trigger,
  EditableToolbar as Toolbar,
  EditableSubmit as Submit,
  EditableCancel as Cancel,
};
