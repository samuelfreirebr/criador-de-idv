import clsx from "clsx";

/**
 * Marca do IDPRO.
 *
 * "ID" em peso máximo e "PRO" no mesmo peso, mas em itálico e na cor da marca:
 * a inclinação separa as duas metades sem precisar de espaço, símbolo ou
 * segunda cor — o que é, convenientemente, exatamente o que este app pede aos
 * conceitos que gera.
 *
 * O ponto final laranja fecha a palavra e dá à marca um ponto de fixação em
 * tamanhos pequenos, onde o itálico sozinho some.
 */
export function Logo({
  tamanho = "md",
  className,
}: {
  tamanho?: "sm" | "md" | "lg";
  className?: string;
}) {
  const escala = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-5xl",
  }[tamanho];

  return (
    <span
      className={clsx(
        "font-display font-extrabold leading-none tracking-[-0.055em] text-ink-50 select-none",
        escala,
        className,
      )}
    >
      ID
      <span className="italic text-brand">PRO</span>
      <span className="text-brand">.</span>
    </span>
  );
}
