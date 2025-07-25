"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import TextareaAutosize from "react-textarea-autosize";
import z from "zod";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Form, FormField } from "@/components/ui/form";
import { ArrowUpIcon, Loader2Icon } from "lucide-react";
import { useTRPC } from "@/trpc/Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { PROJECT_TEMPLATES } from "./constants";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

const formSchema = z.object({
  value: z
    .string()
    .min(1, { message: "Value is required" })
    .max(10000, { message: "Value is too long" }),
});

function ProjectForm() {
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      value: "",
    },
  });

  const createProject = useMutation(
    trpc.projects.create.mutationOptions({
      onSuccess: (data) => {
        queryClient.invalidateQueries(trpc.projects.getMany.queryOptions());
        router.push(`/projects/${data.id}`);
        queryClient.invalidateQueries(trpc.usage.status.queryOptions());
      },
      onError: (error) => {
        if (error?.data?.code === "TOO_MANY_REQUESTS") {
          router.push("/pricing");
        }
        if (error?.data?.code === "UNAUTHORIZED") {
          router.push("/sign-in");
        }

        toast.error(error.message);
      },
    })
  );

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    await createProject.mutateAsync({
      value: values.value,
    });
  };

  const onSelect = (content: string) => {
    form.setValue("value", content, {
      shouldDirty: true,
      shouldValidate: true,
      shouldTouch: true,
    });
  };
  const [isFocused, setIsFocused] = useState(false);
  const isPending = createProject.isPending;
  const isButtonDisabled = isPending || !form.formState.isValid;

  return (
    <Form {...form}>
      <section className="space-y-6">
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className={cn(
            "relative border p-4 pt-1 rounded-xl bg-sidebar dark:bg-sidebar transition-all",
            isFocused && "shadow-xs"
          )}
        >
          <FormField
            control={form.control}
            name="value"
            render={({ field }) => (
              <TextareaAutosize
                {...field}
                disabled={isPending}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                minRows={2}
                maxRows={8}
                className="pt-4 resize-none border-none w-full outline-none bg-transparent"
                placeholder="What would you like to build?"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    form.handleSubmit(onSubmit)(e);
                  }
                }}
              ></TextareaAutosize>
            )}
          />
          <div className="flex gap-x-2 items-end justify-end pt-2">
            <div className="text-[10px] text-muted-foreground font-mono max-lg:hidden">
              <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                <span>&#8984;</span>Enter
              </kbd>
              &nbsp; to submit
            </div>
            <button
              className={cn(
                "size-8 rounded-full flex items-center justify-center bg-card border",
                isButtonDisabled && "opacity-50 cursor-not-allowed",
                !isButtonDisabled &&
                  "hover:text-primary hover:border-primary transition"
              )}
              disabled={isButtonDisabled}
            >
              {isPending ? (
                <Loader2Icon className="size-4 animate-spin"></Loader2Icon>
              ) : (
                <ArrowUpIcon></ArrowUpIcon>
              )}
            </button>
          </div>
        </form>
        <ScrollArea className="md:hidden pb-2">
          <div className="md:flex-wrap md:justify-center gap-2 flex md:max-w-3xl">
            {PROJECT_TEMPLATES.map((template) => {
              return (
                <Button
                  key={template.title}
                  variant={"outline"}
                  size={"sm"}
                  className="bg-white dark:bg-sidebar"
                  onClick={() => onSelect(template.prompt)}
                >
                  {template.emoji} {template.title}
                </Button>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal"></ScrollBar>
        </ScrollArea>
        <div className="max-md:hidden md:flex-wrap md:justify-center gap-2 flex md:max-w-3xl">
          {PROJECT_TEMPLATES.map((template) => {
            return (
              <Button
                key={template.title}
                variant={"outline"}
                size={"sm"}
                className="bg-white dark:bg-sidebar"
                onClick={() => onSelect(template.prompt)}
              >
                {template.emoji} {template.title}
              </Button>
            );
          })}
        </div>
      </section>
    </Form>
  );
}
export default ProjectForm;
