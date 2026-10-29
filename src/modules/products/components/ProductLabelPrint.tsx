'use client';

import JsBarcode from 'jsbarcode';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { ProductRecord } from '../types';

interface ProductLabelPrintProps {
  products: ProductRecord[];
  onClose: () => void;
}

interface BarcodeSvgProps {
  code: string;
  widthMm: number;
  onError: (message: string) => void;
}

function formatCOP(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function BarcodeSvg({ code, widthMm, onError }: BarcodeSvgProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    try {
      const availableWidthPx = widthMm * 3.78 - 28;
      const estimatedModules = (code.length + 3) * 11;
      const barWidth = Math.min(1.7, availableWidthPx / estimatedModules);
      JsBarcode(svg, code, {
        format: 'CODE128',
        width: barWidth,
        height: 31,
        margin: 8,
        displayValue: false,
        lineColor: '#000000',
        background: '#ffffff',
      });
      const viewBox = svg.getAttribute('viewBox')?.split(/\s+/).map(Number);
      const svgWidth = viewBox?.[2] ?? Number(svg.getAttribute('width')?.replace('px', ''));
      const currentHeight = viewBox?.[3] ?? Number(svg.getAttribute('height') ?? 0);
      if (!Number.isFinite(svgWidth) || !Number.isFinite(currentHeight)) {
        throw new Error('El SVG del código de barras no tiene dimensiones válidas.');
      }
      svg.setAttribute('viewBox', `0 0 ${svgWidth} ${currentHeight + 14}`);
      svg.setAttribute('height', String(currentHeight + 14));
      const codeText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      codeText.setAttribute('x', '50%');
      codeText.setAttribute('y', String(currentHeight + 11));
      codeText.setAttribute('text-anchor', 'middle');
      codeText.setAttribute('font-family', 'Arial, sans-serif');
      codeText.setAttribute('font-size', '10');
      codeText.setAttribute('fill', '#000000');
      codeText.textContent = code;
      svg.appendChild(codeText);
      svg.setAttribute('aria-label', `Código de barras Code 128: ${code}`);
    } catch (error) {
      onError(
        error instanceof Error
          ? `No se pudo dibujar el código ${code}: ${error.message}`
          : `No se pudo dibujar el código ${code}.`,
      );
    }
  }, [code, onError, widthMm]);

  return <svg ref={svgRef} role="img" aria-label={`Código de barras Code 128: ${code}`} />;
}

export function ProductLabelPrint({ products, onClose }: ProductLabelPrintProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [copies, setCopies] = useState<Record<string, number>>({});
  const [widthMm, setWidthMm] = useState(50);
  const [heightMm, setHeightMm] = useState(30);
  const [barcodeError, setBarcodeError] = useState('');

  const selectedProducts = products.filter((product) => selectedIds.includes(product.id));
  const labels = selectedProducts.flatMap((product) =>
    Array.from({ length: copies[product.id] ?? 1 }, (_, index) => ({
      product,
      copyNumber: index + 1,
    })),
  );
  const labelStyle: CSSProperties = {
    width: `${widthMm}mm`,
    height: `${heightMm}mm`,
  };

  function toggleProduct(id: string) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((selectedId) => selectedId !== id) : [...current, id],
    );
    setCopies((current) => ({ ...current, [id]: current[id] ?? 1 }));
    setBarcodeError('');
  }

  function updateCopies(id: string, value: string) {
    const amount = Number(value);
    setCopies((current) => ({
      ...current,
      [id]: Number.isInteger(amount) ? Math.min(200, Math.max(1, amount)) : 1,
    }));
    setBarcodeError('');
  }

  return (
    <section className="product-label-print-area mt-6 rounded-lg border border-border bg-surface p-4 shadow-sm">
      <div className="product-label-controls">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">Imprimir etiquetas</h2>
            <p className="mt-1 text-sm text-muted">
              Selecciona productos y copias. Los códigos se generan en Code 128.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-10 rounded-md border border-border px-3 text-sm"
          >
            Cerrar
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label>
            <span className="mb-1 block text-sm font-medium">Ancho de etiqueta (mm)</span>
            <input
              type="number"
              min="30"
              max="100"
              step="1"
              value={widthMm}
              onChange={(event) => {
                const next = Number(event.target.value);
                setWidthMm(Number.isFinite(next) ? Math.min(100, Math.max(30, next)) : 50);
                setBarcodeError('');
              }}
              className="min-h-11 w-full rounded-md border border-border bg-background px-3"
            />
          </label>
          <label>
            <span className="mb-1 block text-sm font-medium">Alto de etiqueta (mm)</span>
            <input
              type="number"
              min="20"
              max="80"
              step="1"
              value={heightMm}
              onChange={(event) => {
                const next = Number(event.target.value);
                setHeightMm(Number.isFinite(next) ? Math.min(80, Math.max(20, next)) : 30);
                setBarcodeError('');
              }}
              className="min-h-11 w-full rounded-md border border-border bg-background px-3"
            />
          </label>
        </div>
        <p className="mt-2 text-sm text-muted">
          Tamaño actual: {widthMm} × {heightMm} mm. Predeterminado: 50 × 30 mm.
        </p>

        <ul className="mt-4 divide-y divide-border rounded-md border border-border">
          {products.map((product) => {
            const selected = selectedIds.includes(product.id);
            return (
              <li
                key={product.id}
                className="flex flex-wrap items-center gap-3 p-3"
              >
                <label className="flex min-h-11 min-w-0 flex-1 items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => toggleProduct(product.id)}
                  />
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{product.name}</span>
                    <span className="block text-sm text-muted">
                      {product.code} · {product.size || 'Sin talla'} · {product.color || 'Sin color'}
                    </span>
                  </span>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  Copias
                  <input
                    type="number"
                    min="1"
                    max="200"
                    step="1"
                    value={copies[product.id] ?? 1}
                    onChange={(event) => updateCopies(product.id, event.target.value)}
                    disabled={!selected}
                    aria-label={`Copias para ${product.name} ${product.code}`}
                    className="min-h-10 w-20 rounded-md border border-border bg-background px-2 disabled:opacity-50"
                  />
                </label>
              </li>
            );
          })}
        </ul>

        {barcodeError && (
          <p role="alert" className="mt-3 rounded-md bg-danger/10 p-3 text-sm">
            {barcodeError}
          </p>
        )}
        {selectedIds.length === 0 && (
          <p className="mt-3 text-sm text-muted">Selecciona al menos un producto para continuar.</p>
        )}
        <button
          type="button"
          disabled={labels.length === 0 || Boolean(barcodeError)}
          onClick={() => window.print()}
          className="mt-4 min-h-12 rounded-md bg-primary px-4 font-semibold text-primary-foreground disabled:opacity-50"
        >
          Imprimir {labels.length} etiqueta(s)
        </button>
      </div>

      <div className="product-label-grid mt-5 flex flex-wrap gap-2">
        {labels.map(({ product, copyNumber }) => (
          <article
            key={`${product.id}-${copyNumber}`}
            className="product-label flex flex-col items-center justify-between overflow-hidden border border-black bg-white px-2 py-1 text-center text-black"
            style={labelStyle}
          >
            <p className="w-full truncate text-xs font-bold">{product.name}</p>
            <BarcodeSvg
              code={product.code}
              widthMm={widthMm}
              onError={setBarcodeError}
            />
            <p className="w-full truncate text-[10px]">
              {product.size ? `Talla ${product.size} · ` : ''}
              {formatCOP(product.salePrice)}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
