import React from "react";
import { Control, ControllerRenderProps } from "react-hook-form";
import { z } from "zod";

import {
  FormField,
  FormItem,
  FormControl,
  FormMessage,
  FormLabel,
} from "../ui/form";

import { formSchema } from "./TransformationForm";

type CustomFieldProps = {
  control: Control<z.infer<typeof formSchema>> | undefined;
  render: (props: {
    field: ControllerRenderProps<{
      title: string;
      publicId: string;
      aspectRatio?: string | undefined;
      color?: string | undefined;
      prompt?: string | undefined;
    }, "title" | "aspectRatio" | "color" | "prompt" | "publicId">
  }) => React.ReactNode;
  name: keyof z.infer<typeof formSchema>;
  formLabel?: string;
  className?: string;
};

export const CustomField = ({
  control,
  render,
  name,
  formLabel,
  className,
}: CustomFieldProps) => {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          {formLabel && <FormLabel>{formLabel}</FormLabel>}
          <FormControl>{render({ field })}</FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};