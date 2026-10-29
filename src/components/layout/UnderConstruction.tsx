import { Container, Typography } from '@/components/ui';

interface UnderConstructionProps {
  description: string;
  title: string;
}

export function UnderConstruction({ description, title }: UnderConstructionProps) {
  return (
    <Container maxWidth="lg" className="py-10 sm:py-14">
      <section className="mx-auto flex max-w-2xl flex-col gap-4 rounded-lg border border-border bg-surface p-6 shadow-sm sm:p-8">
        <Typography variant="secondary" className="font-semibold uppercase tracking-wide text-primary">
          En construcción
        </Typography>
        <Typography variant="title">{title}</Typography>
        <Typography variant="text" className="text-muted">
          {description}
        </Typography>
      </section>
    </Container>
  );
}
