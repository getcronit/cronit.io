import { ContactSection } from "@/components/ContactSection";
import { Container } from "@/components/Container";
import { FadeIn } from "@/components/FadeIn";
import { GrayscaleTransitionImage } from "@/components/GrayscaleTransitionImage";
import { PageIntro } from "@/components/PageIntro";
import { PageLinks } from "@/components/PageLinks";

import {
  Field,
  PageConfig,
  PageProps,
  useAuth,
  useCMSManagementContext,
  useField,
  useJaenPageIndex,
  usePage,
} from "@atsnek/jaen";

import { MagicWandIcon, ReloadIcon } from "@radix-ui/react-icons";
import { fromMarkdown } from "mdast-util-from-markdown";

import { StatList, StatListItem } from "@/components/StatList";
import { TagList, TagListItem } from "@/components/TagList";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { sq } from "@/pylons/website";
import { MdxField } from "@atsnek/jaen-fields-mdx";
import { MdastRoot } from "@atsnek/jaen-fields-mdx/dist/MdxField/components/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { graphql } from "gatsby";
import { withCMSManagement } from "gatsby-plugin-jaen/src/connectors/cms-management";
import React, { useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";

const FormSchema = z.object({
  industry: z.string(),
  input: z.string(),
  results: z.array(
    z.object({
      name: z.string(),
      value: z.string(),
    })
  ),
});

interface GeneratorFormProps {
  client: string;
  services: string[];
  title: string;
  onResult: (result: {
    title: string;
    description: string;
    content: string;
  }) => void;
}

const AudioRecorder = React.lazy(() => import("@/components/AudioRecorder"));

const GeneratorForm: React.FC<GeneratorFormProps> = (props) => {
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
  });

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    const info = {
      title: props.title,
      client: props.client,
      services: props.services,
      industry: data.industry,
      input: data.input,
      results: data.results,
    };

    toast({
      title: "You submitted the following values:",
      description: (
        <pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4">
          <code className="text-white">{JSON.stringify(info, null, 2)}</code>
        </pre>
      ),
    });

    const [value, errors] = await sq.mutate((m) =>
      m.generateCaseStudy({
        info: info,
      })
    );

    if (errors) {
      toast({
        title: "Error",
        variant: "destructive",
        description: (
          <pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4">
            <code className="text-white">
              {JSON.stringify(errors, null, 2)}
            </code>
          </pre>
        ),
      });
    } else {
      toast({
        title: "Success",
        description: (
          <pre className="mt-2 w-[650px] rounded-md bg-slate-950 p-4">
            <code className="text-white">{JSON.stringify(value, null, 2)}</code>
          </pre>
        ),
      });

      props.onResult(value);
    }
  }

  const resultsField = useFieldArray({
    control: form.control,
    name: "results",
  });

  const [isRecording, setIsRecording] = useState(false);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="industry"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Branche</FormLabel>
              <FormControl>
                <Input placeholder="Wähle die Branche" {...field} />
              </FormControl>
              <FormDescription>
                Wähle die Branche, um den Inhalt zu generieren.
              </FormDescription>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="input"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Beschreibung</FormLabel>
              {typeof window !== "undefined" && (
                <React.Suspense fallback={<div>Loading...</div>}>
                  <AudioRecorder
                    onData={(data) => {
                      const current = form.getValues()["input"] || "";
                      const newValue = current ? `${current}\n${data}` : data;

                      form.setValue("input", newValue);
                    }}
                    onRecord={(isRecording) => setIsRecording(isRecording)}
                  />
                </React.Suspense>
              )}
              <FormControl>
                <Textarea
                  className={cn("min-h-[250px]", {
                    "animate-pulse": isRecording,
                  })}
                  placeholder="Beschreibe die Case-Study"
                  disabled={isRecording}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Beschreibe die Case-Study, um den Inhalt zu generieren.
                Zusatzinformationen wie Kundenname, Jahr und Service werden
                automatisch hinzugefügt.
              </FormDescription>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="results"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ergebnisse</FormLabel>
              <FormControl>
                <div className="space-y-2">
                  {resultsField.fields.map((field, index) => (
                    <div key={field.id} className="space-y-2">
                      <div className="flex space-x-2">
                        <Input
                          placeholder="Name"
                          {...form.register(`results.${index}.name` as const)}
                        />
                        <Input
                          placeholder="Wert"
                          {...form.register(`results.${index}.value` as const)}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => resultsField.remove(index)}
                        >
                          Löschen
                        </Button>
                      </div>
                    </div>
                  ))}

                  <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    onClick={() => resultsField.append({ name: "", value: "" })}
                  >
                    Ergebnis hinzufügen
                  </Button>
                </div>
              </FormControl>
              <FormDescription>
                Füge Ergebnisse hinzu, um den Inhalt zu generieren.
              </FormDescription>
            </FormItem>
          )}
        />

        <Button
          type="submit"
          className="w-full"
          disabled={form.formState.isSubmitting || !form.formState.isValid}
        >
          <MagicWandIcon
            className={cn("h-4 w-4 mr-2", {
              // hide
              hidden: form.formState.isSubmitting,
            })}
          />
          <ReloadIcon
            className={cn("h-4 w-4 mr-2 animate-spin", {
              // hide
              hidden: !form.formState.isSubmitting,
            })}
          />
          Generate
        </Button>
      </form>
    </Form>
  );
};

const Page: React.FC<PageProps> = withCMSManagement(() => {
  const page = usePage({});
  const manager = useCMSManagementContext();

  const index = useJaenPageIndex({ jaenPageId: "JaenPage /work/" });

  const moreCaseStudies = useMemo(() => {
    const currentIndex = index.childPages.findIndex(
      (childPage) => childPage.id === page.id
    );
    const nextPages = [
      ...index.childPages.slice(currentIndex + 1),
      ...index.childPages.slice(0, currentIndex),
    ]; // Reorder the array to start from the current page's position
    return nextPages
      .filter((childPage) => childPage.id !== page.id)
      .slice(0, 2) // Take the next two pages
      .map((childPage) => {
        return {
          title: childPage.jaenPageMetadata?.title,
          date: childPage.jaenPageMetadata?.blogPost?.date || "",
          description: childPage.jaenPageMetadata?.description,
          href: `/work/${childPage.slug}`,
        };
      });
  }, [index, page.id]);

  const clientField = useField<string>("client", "IMA:TextField");
  const clientValue = clientField.value || clientField.staticValue || "";

  const mdxField = useField<MdastRoot>("undefined", "IMA:MdxField");

  const servicesValue =
    page.jaenPageMetadata?.blogPost?.category
      ?.split(",")
      ?.map((c) => c.trim()) || [];

  const auth = useAuth();

  return (
    <>
      <article className="mt-24 sm:mt-32 lg:mt-40">
        <header>
          <PageIntro
            eyebrow="Case Study"
            title={page.jaenPageMetadata?.title}
            centered
          >
            <p>{page.jaenPageMetadata?.description}</p>
          </PageIntro>

          <FadeIn>
            <div className="mt-24 border-t border-neutral-200 bg-white/50 sm:mt-32 lg:mt-40">
              <Container>
                <div className="mx-auto max-w-5xl">
                  <dl className="-mx-6 grid grid-cols-1 text-sm text-neutral-950 sm:mx-0 sm:grid-cols-3">
                    <div className="border-t border-neutral-200 px-6 py-4 first:border-t-0 sm:border-l sm:border-t-0">
                      <dt className="font-semibold">Kunde</dt>
                      <Field.Text
                        as="dd"
                        name="client"
                        defaultValue="Client A"
                      />
                    </div>
                    <div className="border-t border-neutral-200 px-6 py-4 first:border-t-0 sm:border-l sm:border-t-0">
                      <dt className="font-semibold">Jahr</dt>
                      <dd>
                        <time
                          dateTime={page.jaenPageMetadata?.blogPost?.date || ""}
                        >
                          {page.jaenPageMetadata?.blogPost?.date?.split("-")[0]}
                        </time>
                      </dd>
                    </div>
                    <div className="border-t border-neutral-200 px-6 py-4 first:border-t-0 sm:border-l sm:border-t-0">
                      <dt className="font-semibold">Service</dt>
                      <dd>{page.jaenPageMetadata?.blogPost?.category}</dd>
                    </div>
                  </dl>
                </div>
              </Container>
            </div>

            <div className="border-y border-neutral-200 bg-neutral-100">
              <div className="-my-px mx-auto max-w-[76rem] py-24 bg-gradient-to-r from-cyan-500 to-blue-500">
                <GrayscaleTransitionImage className="w-full aspect-[16/10]" />
              </div>
            </div>
          </FadeIn>
        </header>

        <Container className="mt-24 sm:mt-32 lg:mt-40">
          <FadeIn>
            <div className="[&>*]:mx-auto [&>*]:max-w-3xl [&>:first-child]:!mt-0 [&>:last-child]:!mb-0 typography">
              {auth.isAuthenticated && (
                <Collapsible>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MagicWandIcon className="h-4 w-4 mr-2" />
                      Content Generator
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <GeneratorForm
                      client={clientValue}
                      services={servicesValue}
                      title={page.jaenPageMetadata.title || "No title yet"}
                      onResult={(result) => {
                        manager.updatePage(page.id, {
                          jaenPageMetadata: {
                            description: result.description,
                            title: result.title,
                          },
                        });
                        mdxField.write(fromMarkdown(result.content));
                      }}
                    />
                  </CollapsibleContent>
                </Collapsible>
              )}

              <MdxField
                key={JSON.stringify(
                  mdxField.value || mdxField.staticValue || "1"
                )}
                components={{
                  TagList,
                  TagListItem,
                  Blockquote: ({ text, author }) => (
                    <figure
                      className={
                        "grid grid-cols-[auto,1fr] items-center gap-x-4 gap-y-8 sm:grid-cols-12 sm:grid-rows-[1fr,auto,auto,1fr] sm:gap-x-10 lg:gap-x-16"
                      }
                    >
                      <blockquote className="col-span-2 text-xl/7 text-neutral-600 sm:col-span-7 sm:col-start-6 sm:row-start-2">
                        {text}
                      </blockquote>

                      <div className="col-start-1 row-start-2 overflow-hidden rounded-xl bg-neutral-100 sm:col-span-5 sm:row-span-full sm:rounded-3xl">
                        <Field.Image
                          name={"image"}
                          autoScale={true}
                          sizes="(min-width: 1024px) 17.625rem, (min-width: 768px) 16rem, (min-width: 640px) 40vw, 3rem"
                          className="h-12 w-12 object-cover grayscale sm:aspect-[7/9] sm:h-auto sm:w-full"
                        />
                      </div>

                      <figcaption className="text-sm text-neutral-950 sm:col-span-7 sm:row-start-3 sm:text-base">
                        {author}
                      </figcaption>
                    </figure>
                  ),
                  StatList,
                  StatListItem,
                }}
              />
            </div>
          </FadeIn>
        </Container>
      </article>

      {moreCaseStudies.length > 0 && (
        <PageLinks
          className="mt-24 sm:mt-32 lg:mt-40"
          title="Weitere Case Studies"
          pages={moreCaseStudies}
        />
      )}

      <ContactSection />
    </>
  );
});

export default Page;

export const pageConfig: PageConfig = {
  label: "Work",
};

export const query = graphql`
  query ($jaenPageId: String!) {
    ...JaenPageQuery
    allJaenPage(filter: { id: { eq: "JaenPage /work/" } }) {
      nodes {
        ...JaenPageData
        childPages {
          ...JaenPageData
        }
      }
    }
  }
`;

export { Head } from "@atsnek/jaen";
