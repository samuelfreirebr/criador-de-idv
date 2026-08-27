/**
 * Conjunto único de ícones.
 *
 * Sem `"use client"`: são componentes sem estado, e assim servem tanto às telas
 * de servidor quanto às de cliente. `IconName` é importado como tipo pelas
 * pastas de bloco — importação de tipo é apagada na compilação, então declarar
 * um ícone não arrasta React nenhum para dentro da definição.
 *
 * Cada nome descreve o QUE o ícone significa, não como ele é desenhado. Um
 * nome genérico como "marca" convida a reaproveitar o mesmo desenho em três
 * lugares que não têm nada a ver entre si — foi o que aconteceu com um escudo
 * que acabou servindo de nome de projeto, de título de conceito e de símbolo.
 */

// Sem anotação de tipo de propósito: assim o TypeScript infere as chaves
// literais e `IconName` vira a união dos nomes que existem de verdade. Com
// `Record<string, string>` qualquer string passava, e um ícone removido só
// aparecia como um espaço em branco na tela.
const CAMINHOS = {
  // --- Blocos do briefing ---
  /** Briefing: página com linhas de texto. */
  documento: "M8 3h8l4 4v14H4V3h4Zm8 0v4h4M8 12h8M8 16h5",
  /** Referências visuais: moldura com imagem. */
  imagem: "M3 5h18v14H3zM8.5 10.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM3 16l5-4 4 3 3-2 6 5",
  /** Temperamento: barras deslizantes. */
  barras: "M4 7h16M4 12h16M4 17h16M9 4v6M16 9v6M7 14v6",
  /** Tipografia: a letra desenhada. */
  tipografia: "M4 6V4h16v2M12 4v16M9 20h6",
  /** Cores: paleta de pintura. */
  paleta:
    "M12 3a9 9 0 1 0 0 18h1.5a2 2 0 0 0 1.4-3.4 2 2 0 0 1 1.4-3.4H18a3 3 0 0 0 3-3 9 9 0 0 0-9-8.2ZM7.5 12.5h.01M10 8h.01M14.5 7.5h.01M17 11h.01",
  /** Restrições: proibido. */
  proibido: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM5.6 5.6l12.8 12.8",
  /** Entrega: o pacote que sai. */
  caixa: "M4 8 12 4l8 4v8l-8 4-8-4V8Zm0 0 8 4m0 0 8-4m-8 4v9",

  // --- Campos ---
  /** O que buscar nas referências: lupa. */
  lupa: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14ZM16.2 16.2 20.5 20.5",
  /** Adjetivos e palavras soltas: etiqueta. */
  etiqueta: "M4 4h7l9 9-7 7-9-9V4Zm3.6 3.6h.01",
  /** Precisa transmitir: ondas que saem do centro. */
  ondas:
    "M12 12h.01M9 9a4.2 4.2 0 0 0 0 6M15 9a4.2 4.2 0 0 1 0 6M6 6a8.5 8.5 0 0 0 0 12M18 6a8.5 8.5 0 0 1 0 12",
  /** Precisa funcionar em: o mesmo desenho em dois tamanhos. */
  escala: "M4 14h6v6H4zM10 4h10v10H10z",
  /** Aplicações: um conjunto de peças. */
  grade: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  /** Carregar arquivo. */
  upload: "M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3",

  // --- Card de ideia ---
  /** O conceito: uma marca dentro do seu quadro. */
  conceito:
    "M6 3h12a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3ZM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z",
  /** Ideia central: a faísca. */
  faisca:
    "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3ZM18.5 16l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z",
  /** O símbolo: formas geométricas compondo. */
  simbolo: "M8.5 3 14.5 13.5H2.5zM16.5 9.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11Z",
  /** Gesto assinatura: o traço que se repete. */
  curva: "M3.5 18C3.5 10 8.5 5 15 5M15 5l-3.2 2.4M15 5l.9 3.9",
  /** Por que funciona: acerta o alvo. */
  alvo:
    "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM12 11.9h.01",

  // --- Interface ---
  menu: "M4 7h16M4 12h16M4 17h16",
  fechar: "M6 6l12 12M18 6 6 18",
  mais: "M12 5v14M5 12h14",
  lixo: "M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13M10 11v6M14 11v6",
  copiar: "M9 9h11v11H9zM5 15H4V4h11v1",
  check: "M4 12.5 9 17.5 20 6.5",
  coracao: "M12 20s-7-4.4-7-9a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 4.6-7 9-7 9Z",
  descartar: "M6 6l12 12M18 6 6 18",
  sair: "M15 12H4m0 0 4-4m-4 4 4 4M10 4h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-8",
  pasta: "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z",
  /** Abrir/fechar uma seção. Gira 90° quando aberta. */
  chevron: "M9 6l6 6-6 6",
  /** Recolher a barra lateral. */
  recolher: "M15 6l-6 6 6 6",
  /** Recriar um estado anterior: relógio com volta. */
  historico: "M3.4 9.5A8.6 8.6 0 1 1 3 12.4M3.4 9.5H8M3.4 9.5V5M12 8.2v4.3l3 1.6",
  /** Refazer / gerar outra versão. */
  atualizar: "M20.5 12a8.5 8.5 0 1 1-2.5-6M20.5 3.5V9H15",
  /** Converter para outro idioma. */
  traduzir: "M3.5 6.5h9M8 4.5v2c0 4.2-1.9 7.2-4.5 8.3M5.8 11c0 2.6 2.6 5.2 6.7 5.7M12.6 20.5l4.2-9.5 4.2 9.5M14.3 17h5",
  /** Anotar. */
  nota: "M4 20v-3.5L15 5.6a2 2 0 0 1 2.9 2.9L7 19.4 3.5 20ZM13.4 7.6l3 3",
} as const satisfies Record<string, string>;

export type IconName = keyof typeof CAMINHOS;

export function Icon({
  name,
  size = 18,
  className,
}: {
  name: IconName;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d={CAMINHOS[name]} />
    </svg>
  );
}
