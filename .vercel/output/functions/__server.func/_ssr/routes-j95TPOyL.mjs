import { i as __toESM } from "../_runtime.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { v as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as TSS_SERVER_FUNCTION, r as getServerFnById, t as createServerFn } from "./ssr.mjs";
import { a as formatInt, c as formatWhen, d as shortTicker, f as timeframeLabel, n as TIMEFRAMES, o as formatPct, s as formatPrice, t as POPULAR_TICKERS, u as normalizeTicker } from "./types-CavFGrUc.mjs";
import { a as LoaderCircle, c as Eye, d as Check, f as ChartColumn, i as TrendingDown, l as Database, o as Info, p as ArrowLeft, r as TrendingUp, s as ImagePlus, t as X, u as Clock } from "../_libs/lucide-react.mjs";
import { t as Slot } from "../_libs/radix-ui__react-slot.mjs";
import { n as clsx, t as cva } from "../_libs/class-variance-authority+clsx.mjs";
import { t as twMerge } from "../_libs/tailwind-merge.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-j95TPOyL.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function cn(...inputs) {
	return twMerge(clsx(inputs));
}
var buttonVariants = cva("inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-[opacity,transform,background-color,box-shadow] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:shrink-0", {
	variants: {
		variant: {
			default: "bg-accent text-accent-fg shadow-[var(--shadow-border)] hover:opacity-90 active:scale-[0.98]",
			secondary: "bg-surface text-fg shadow-[var(--shadow-border)] hover:shadow-[var(--shadow-border-hover)] active:scale-[0.98]",
			ghost: "bg-transparent text-muted hover:text-fg hover:bg-surface",
			outline: "bg-transparent text-fg shadow-[var(--shadow-border)] hover:shadow-[var(--shadow-border-hover)]"
		},
		size: {
			default: "h-11 rounded-md px-4 text-sm",
			sm: "h-9 rounded-sm px-3 text-sm",
			lg: "h-12 rounded-lg px-5 text-base",
			icon: "size-11 rounded-md"
		}
	},
	defaultVariants: {
		variant: "default",
		size: "default"
	}
});
function Button({ className, variant, size, asChild = false, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(asChild ? Slot : "button", {
		className: cn(buttonVariants({
			variant,
			size,
			className
		})),
		...props
	});
}
function Input({ className, type, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
		type,
		className: cn("flex h-11 w-full rounded-md bg-surface px-3 text-sm text-fg shadow-[var(--shadow-border)]", "placeholder:text-subtle", "transition-[box-shadow] duration-150", "focus-visible:outline-none focus-visible:shadow-[var(--shadow-border-hover)] focus-visible:ring-2 focus-visible:ring-ring/60", "disabled:cursor-not-allowed disabled:opacity-50", className),
		...props
	});
}
var MAX_EDGE = 1280;
var JPEG_QUALITY = .72;
async function fileToDataUrl(file) {
	const bitmap = await createImageBitmap(file);
	let w = bitmap.width;
	let h = bitmap.height;
	if (w > MAX_EDGE) {
		h = Math.round(h * MAX_EDGE / w);
		w = MAX_EDGE;
	} else if (h > MAX_EDGE) {
		w = Math.round(w * MAX_EDGE / h);
		h = MAX_EDGE;
	}
	const canvas = document.createElement("canvas");
	canvas.width = w;
	canvas.height = h;
	const ctx = canvas.getContext("2d");
	if (!ctx) {
		bitmap.close();
		throw new Error("Não foi possível processar a imagem.");
	}
	ctx.drawImage(bitmap, 0, 0, w, h);
	bitmap.close();
	return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
}
async function makeThumb(dataUrl, size = 160) {
	try {
		const img = await createImageBitmap(await (await fetch(dataUrl)).blob());
		const scale = size / Math.max(img.width, img.height);
		const w = Math.max(1, Math.round(img.width * scale));
		const h = Math.max(1, Math.round(img.height * scale));
		const canvas = document.createElement("canvas");
		canvas.width = w;
		canvas.height = h;
		const ctx = canvas.getContext("2d");
		if (!ctx) {
			img.close();
			return null;
		}
		ctx.drawImage(img, 0, 0, w, h);
		img.close();
		return canvas.toDataURL("image/jpeg", .6);
	} catch {
		return null;
	}
}
function UploadZone({ value, onChange, disabled }) {
	const inputId = (0, import_react.useId)();
	const inputRef = (0, import_react.useRef)(null);
	const [drag, setDrag] = (0, import_react.useState)(false);
	const [error, setError] = (0, import_react.useState)(null);
	const ingest = (0, import_react.useCallback)(async (file) => {
		setError(null);
		if (!file.type.startsWith("image/")) {
			setError("Envie uma imagem do gráfico.");
			return;
		}
		if (file.size > 8e6) {
			setError("Arquivo grande demais. Recorte o print.");
			return;
		}
		try {
			onChange(await fileToDataUrl(file));
		} catch {
			setError("Não foi possível ler essa imagem.");
		}
	}, [onChange]);
	(0, import_react.useEffect)(() => {
		const onPaste = (e) => {
			if (disabled) return;
			const file = [...e.clipboardData?.items ?? []].find((i) => i.type.startsWith("image/"))?.getAsFile();
			if (file) {
				e.preventDefault();
				ingest(file);
			}
		};
		window.addEventListener("paste", onPaste);
		return () => window.removeEventListener("paste", onPaste);
	}, [disabled, ingest]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-2",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				ref: inputRef,
				id: inputId,
				type: "file",
				accept: "image/*",
				className: "sr-only",
				disabled,
				onChange: (e) => {
					const file = e.target.files?.[0];
					if (file) ingest(file);
					e.target.value = "";
				}
			}),
			value ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "relative overflow-hidden rounded-xl bg-surface p-1.5 shadow-[var(--shadow-border)]",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
					src: value,
					alt: "Print do gráfico",
					className: "chart-print max-h-56 w-full rounded-lg object-contain"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					disabled,
					onClick: () => onChange(null),
					className: "absolute top-3 right-3 flex size-11 items-center justify-center rounded-md bg-bg/80 text-fg shadow-[var(--shadow-border)]",
					"aria-label": "Remover print",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "size-4" })
				})]
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
				htmlFor: inputId,
				onDragOver: (e) => {
					e.preventDefault();
					if (!disabled) setDrag(true);
				},
				onDragLeave: () => setDrag(false),
				onDrop: (e) => {
					e.preventDefault();
					setDrag(false);
					const file = e.dataTransfer.files?.[0];
					if (file) ingest(file);
				},
				className: cn("flex min-h-40 cursor-pointer flex-col items-center justify-center gap-3 rounded-xl bg-surface px-4 py-8 text-center shadow-[var(--shadow-border)] transition-[box-shadow,background-color] duration-150", drag && "shadow-[var(--shadow-border-hover)] bg-bg-elevated", disabled && "pointer-events-none opacity-50"),
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "flex size-11 items-center justify-center rounded-md bg-bg shadow-[var(--shadow-border)]",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ImagePlus, { className: "size-5 text-accent" })
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "space-y-1",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "block text-sm font-medium text-fg",
						children: "Envie o print do gráfico"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "block text-xs text-muted",
						children: "Toque, solte o arquivo ou cole com Ctrl+V. Opcional — a estatística usa o OHLC real."
					})]
				})]
			}),
			error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs text-down",
				children: error
			}) : null
		]
	});
}
function AnalyzeForm({ ticker, timeframe, image, busy, error, onTicker, onTimeframe, onImage, onSubmit }) {
	const current = normalizeTicker(ticker);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
		className: "space-y-5",
		onSubmit: (e) => {
			e.preventDefault();
			onSubmit();
		},
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(UploadZone, {
				value: image,
				onChange: onImage,
				disabled: busy
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
						htmlFor: "ticker",
						className: "text-xs tracking-wide text-muted uppercase",
						children: "Par"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						id: "ticker",
						name: "ticker",
						value: ticker,
						onChange: (e) => onTicker(e.target.value),
						placeholder: "BTC, ETHUSDT, SOL…",
						autoCapitalize: "characters",
						autoCorrect: "off",
						spellCheck: false,
						disabled: busy,
						className: "font-mono uppercase"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "flex flex-wrap gap-1.5 pt-1",
						children: POPULAR_TICKERS.slice(0, 6).map((t) => {
							return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								disabled: busy,
								onClick: () => onTicker(shortTicker(t)),
								className: cn("h-9 rounded-full px-3 text-xs font-medium shadow-[var(--shadow-border)]", current === t ? "bg-accent text-accent-fg" : "bg-surface text-muted hover:text-fg"),
								children: shortTicker(t)
							}, t);
						})
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs tracking-wide text-muted uppercase",
					children: "Tempo gráfico"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex gap-1 rounded-lg bg-surface p-1 shadow-[var(--shadow-border)]",
					children: TIMEFRAMES.map((tf) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						disabled: busy,
						onClick: () => onTimeframe(tf),
						className: cn("h-10 flex-1 rounded-md text-sm font-medium transition-colors duration-150", timeframe === tf ? "bg-bg-elevated text-fg shadow-[var(--shadow-border)]" : "text-muted hover:text-fg"),
						children: tf
					}, tf))
				})]
			}),
			error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "rounded-md bg-down/10 px-3 py-2 text-sm text-down",
				children: error
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				type: "submit",
				size: "lg",
				className: "w-full",
				disabled: busy || !ticker.trim(),
				children: busy ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "size-4 animate-spin" }), "Analisando"] }) : "Analisar"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-center text-xs text-subtle",
				children: "Sem print, a análise usa só o histórico real do par."
			})
		]
	});
}
var badgeVariants = cva("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium tracking-wide", {
	variants: { variant: {
		default: "bg-surface text-muted shadow-[var(--shadow-border)]",
		up: "bg-up/15 text-up",
		down: "bg-down/15 text-down",
		warn: "bg-warn/15 text-warn",
		accent: "bg-accent/15 text-accent"
	} },
	defaultVariants: { variant: "default" }
});
function Badge({ className, variant, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: cn(badgeVariants({ variant }), className),
		...props
	});
}
function Separator({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		role: "separator",
		className: cn("h-px w-full bg-border", className),
		...props
	});
}
function linePath(values, x, y) {
	let d = "";
	let started = false;
	for (let i = 0; i < values.length; i++) {
		const v = values[i];
		if (v == null) {
			started = false;
			continue;
		}
		d += `${started ? "L" : "M"} ${x(i).toFixed(2)} ${y(v).toFixed(2)} `;
		started = true;
	}
	return d.trim();
}
function OhlcChart({ data, className }) {
	const layout = (0, import_react.useMemo)(() => {
		if (data.length === 0) return null;
		const min = Math.min(...data.map((d) => d.l));
		const max = Math.max(...data.map((d) => d.h));
		const pad = (max - min) * .08 || 1;
		const yMin = min - pad;
		const yMax = max + pad;
		const w = 640;
		const h = 220;
		const left = 4;
		const top = 8;
		const innerW = 632;
		const innerH = 204;
		const slot = innerW / data.length;
		const y = (v) => top + (yMax - v) / (yMax - yMin) * innerH;
		const x = (i) => left + slot * i + slot / 2;
		return {
			w,
			h,
			y,
			x,
			bodyW: Math.max(1.2, slot * .55),
			sma20: linePath(data.map((d) => d.sma20), x, y),
			sma50: linePath(data.map((d) => d.sma50), x, y),
			last: data[data.length - 1]
		};
	}, [data]);
	if (!layout) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: cn("flex h-48 items-center justify-center text-sm text-muted", className),
		children: "Sem candles para desenhar."
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: cn("relative", className),
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
			viewBox: `0 0 ${layout.w} ${layout.h}`,
			className: "h-auto w-full",
			role: "img",
			"aria-label": "Gráfico de candles recentes com médias móveis",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
					d: layout.sma50,
					fill: "none",
					stroke: "var(--color-subtle)",
					strokeWidth: "1.2"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
					d: layout.sma20,
					fill: "none",
					stroke: "var(--color-accent)",
					strokeWidth: "1.2"
				}),
				data.map((d, i) => {
					const color = d.c >= d.o ? "var(--color-up)" : "var(--color-down)";
					const bodyTop = layout.y(Math.max(d.o, d.c));
					const bodyBot = layout.y(Math.min(d.o, d.c));
					const bh = Math.max(.8, bodyBot - bodyTop);
					const cx = layout.x(i);
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("g", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
						x1: cx,
						x2: cx,
						y1: layout.y(d.h),
						y2: layout.y(d.l),
						stroke: color,
						strokeWidth: "1"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
						x: cx - layout.bodyW / 2,
						y: bodyTop,
						width: layout.bodyW,
						height: bh,
						fill: color,
						rx: "0.4"
					})] }, d.t);
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mt-2 flex items-center justify-between text-xs text-muted",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
				className: "flex items-center gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "inline-flex items-center gap-1.5",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "size-1.5 rounded-full bg-accent" }), "SMA20"]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "inline-flex items-center gap-1.5",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "size-1.5 rounded-full bg-subtle" }), "SMA50"]
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "font-mono tabular-nums text-fg",
				children: formatPrice(layout.last.c)
			})]
		})]
	});
}
function PathChart({ horizon, className }) {
	const layout = (0, import_react.useMemo)(() => {
		const values = [0, ...horizon.medianPath];
		if (values.length < 2) return null;
		const min = Math.min(...values);
		const max = Math.max(...values);
		const pad = Math.max(.15, (max - min) * .18);
		const yMin = min - pad;
		const yMax = max + pad;
		const w = 320;
		const h = 96;
		const x = (i) => i / (values.length - 1) * w;
		const y = (v) => (yMax - v) / (yMax - yMin) * h;
		const zeroY = y(0);
		const d = values.map((v, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
		const area = `${d} L ${w} ${zeroY.toFixed(1)} L 0 ${zeroY.toFixed(1)} Z`;
		const last = values[values.length - 1];
		return {
			w,
			h,
			d,
			area,
			zeroY,
			last,
			up: last >= 0
		};
	}, [horizon]);
	if (!layout) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: cn("relative", className),
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
			viewBox: `0 0 ${layout.w} ${layout.h}`,
			className: "h-24 w-full",
			role: "img",
			"aria-label": "Caminho mediano após a condição",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
					x1: "0",
					x2: layout.w,
					y1: layout.zeroY,
					y2: layout.zeroY,
					stroke: "var(--color-border)",
					strokeDasharray: "3 4"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
					d: layout.area,
					fill: layout.up ? "color-mix(in oklab, var(--color-up) 18%, transparent)" : "color-mix(in oklab, var(--color-down) 18%, transparent)"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
					d: layout.d,
					fill: "none",
					stroke: layout.up ? "var(--color-up)" : "var(--color-down)",
					strokeWidth: "1.8"
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
			className: "mt-1 text-xs text-muted",
			children: [
				"Caminho mediano até ",
				horizon.label.split(" · ")[0],
				":",
				" ",
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: cn("font-mono tabular-nums", layout.up ? "text-up" : "text-down"),
					children: formatPct(layout.last)
				})
			]
		})]
	});
}
function SplitBar({ horizon }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex h-2 overflow-hidden rounded-full bg-bg",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "bg-up",
					style: { width: `${horizon.upPct}%` }
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "bg-subtle/60",
					style: { width: `${horizon.flatPct}%` }
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "bg-down",
					style: { width: `${horizon.downPct}%` }
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dl", {
			className: "grid grid-cols-3 gap-2 text-center",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
					label: "subiu",
					value: horizon.upPct,
					tone: "up"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
					label: "lateral",
					value: horizon.flatPct,
					tone: "muted"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
					label: "caiu",
					value: horizon.downPct,
					tone: "down"
				})
			]
		})]
	});
}
function Stat({ label, value, tone }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
		className: "text-xs text-muted",
		children: label
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
		className: cn("font-mono text-sm tabular-nums", tone === "up" && "text-up", tone === "down" && "text-down", tone === "muted" && "text-fg"),
		children: `${Math.round(value)}%`
	})] });
}
function AnalysisResult({ analysis, onBack }) {
	const { snapshot, precedent, vision } = analysis;
	const [horizonIdx, setHorizonIdx] = (0, import_react.useState)(1);
	const horizon = precedent.horizons[horizonIdx] ?? precedent.horizons[0];
	const up = snapshot.changePct >= 0;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
		className: "mx-auto flex w-full max-w-lg flex-col gap-6 pb-16 lg:max-w-none",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "flex items-start gap-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "ghost",
						size: "icon",
						onClick: onBack,
						"aria-label": "Nova análise",
						className: "-ml-2",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowLeft, { className: "size-5" })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "min-w-0 flex-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "text-xs tracking-wide text-muted uppercase",
							children: [
								analysis.source,
								" · ",
								timeframeLabel(analysis.timeframe)
							]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
							className: "font-display text-3xl leading-tight tracking-tight text-fg",
							children: analysis.displayTicker
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "text-right",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-mono text-lg tabular-nums text-fg",
							children: formatPrice(snapshot.last.c)
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: cn("font-mono text-xs tabular-nums", up ? "text-up" : "text-down"),
							children: formatPct(snapshot.changePct)
						})]
					})
				]
			}),
			analysis.thumb || vision ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "overflow-hidden rounded-xl bg-surface shadow-[var(--shadow-border)]",
				children: [analysis.thumb ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
					src: analysis.thumb,
					alt: "Print enviado",
					className: "chart-print h-36 w-full object-cover object-top"
				}) : null, /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-3 p-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-2 text-xs tracking-wide text-muted uppercase",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Eye, { className: "size-3.5" }),
							"Leitura visual",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-subtle",
								children: "apoio qualitativo"
							})
						]
					}), vision ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm leading-relaxed text-fg",
							children: vision.leitura
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex flex-wrap gap-1.5",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Badge, {
									variant: "accent",
									children: ["tendência ", vision.tendencia]
								}),
								vision.padrao ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, { children: vision.padrao }) : null,
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Badge, { children: ["confiança ", vision.confianca] })
							]
						}),
						vision.suporteResistencia ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs text-muted",
							children: vision.suporteResistencia
						}) : null
					] }) : analysis.visionError ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-muted",
						children: analysis.visionError
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-muted",
						children: "Nenhum print nesta análise."
					})]
				})]
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-6 lg:grid-cols-2 lg:items-start",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-6",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
						className: "space-y-3",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
								className: "text-xs tracking-wide text-muted uppercase",
								children: "Condição atual · dado real"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "grid grid-cols-2 gap-2",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Metric, {
										label: "RSI 14",
										value: snapshot.rsi14.toFixed(1).replace(".", ",")
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Metric, {
										label: "vs SMA20",
										value: formatPct(snapshot.distSma20Pct),
										tone: snapshot.distSma20Pct >= 0 ? "up" : "down"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Metric, {
										label: "vs SMA50",
										value: formatPct(snapshot.distSma50Pct),
										tone: snapshot.distSma50Pct >= 0 ? "up" : "down"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Metric, {
										label: "SMA200",
										value: snapshot.sma200 != null ? formatPrice(snapshot.sma200) : "—"
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "text-sm leading-relaxed text-muted",
								children: [
									precedent.fingerprintLabel,
									".",
									snapshot.lastExtrema ? ` Último ${snapshot.lastExtrema.type === "top" ? "topo" : "fundo"} há ${snapshot.lastExtrema.barsAgo} barras.` : null
								]
							})
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
						className: "space-y-4 rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-xs tracking-wide text-muted uppercase",
									children: "Precedente histórico"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mt-2 font-display text-5xl leading-none tracking-tight text-fg tabular-nums",
									children: formatInt(precedent.matches)
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "mt-2 text-sm text-muted",
									children: [
										"vezes em ",
										formatInt(analysis.candleCount),
										" candles desta série.",
										precedent.relaxed.length > 0 ? ` Filtros relaxados: ${precedent.relaxed.join(", ")}.` : null
									]
								}),
								precedent.sampleNote !== "ok" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "mt-2 flex items-start gap-2 text-xs text-warn",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Info, { className: "mt-0.5 size-3.5 shrink-0" }), precedent.sampleNote === "tiny" ? "Amostra muito pequena — trate como ilustração, não como base." : "Amostra pequena — interprete com cautela."]
								}) : null
							] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Separator, {}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "flex gap-1 rounded-md bg-bg p-1",
								children: precedent.horizons.map((h, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									type: "button",
									onClick: () => setHorizonIdx(i),
									className: cn("h-10 flex-1 rounded-sm text-xs font-medium transition-colors duration-150", i === horizonIdx ? "bg-surface text-fg shadow-[var(--shadow-border)]" : "text-muted hover:text-fg"),
									children: [h.bars, " barras"]
								}, h.bars))
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "text-sm text-fg",
								children: ["O que aconteceu depois · ", horizon.label]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SplitBar, { horizon }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dl", {
								className: "grid grid-cols-2 gap-3 pt-1",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
										label: "mediana",
										value: formatPct(horizon.medianPct)
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
										label: "média",
										value: formatPct(horizon.meanPct)
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
										label: "10% pior que (P10)",
										value: formatPct(horizon.p10)
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
										label: "10% melhor que (P90)",
										value: formatPct(horizon.p90)
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PathChart, { horizon })
						]
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-6",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
						className: "space-y-3 rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "text-xs tracking-wide text-muted uppercase",
							children: "Série recente"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(OhlcChart, { data: analysis.chart })]
					}), precedent.recentMatches.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
						className: "space-y-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "text-xs tracking-wide text-muted uppercase",
							children: "Ocorrências recentes"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
							className: "divide-y divide-border overflow-hidden rounded-xl bg-surface shadow-[var(--shadow-border)]",
							children: precedent.recentMatches.map((m) => {
								const pos = m.forward >= 0;
								return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
									className: "flex items-center justify-between gap-3 px-4 py-3",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-sm text-muted",
										children: formatWhen(m.t)
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: cn("inline-flex items-center gap-1 font-mono text-sm tabular-nums", pos ? "text-up" : "text-down"),
										children: [pos ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TrendingUp, { className: "size-3.5" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TrendingDown, { className: "size-3.5" }), formatPct(m.forward)]
									})]
								}, m.t);
							})
						})]
					}) : null]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "text-xs leading-relaxed text-subtle",
				children: [
					"Frequência e contexto, nunca ordem de compra ou venda. O passado não garante o próximo movimento. A leitura do print é qualitativa; o que conta para a estatística é o OHLC da ",
					analysis.source,
					"."
				]
			})
		]
	});
}
function Metric({ label, value, tone }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-lg bg-surface px-3 py-3 shadow-[var(--shadow-border)]",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-xs text-muted",
			children: label
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: cn("mt-1 font-mono text-base tabular-nums", tone === "up" && "text-up", tone === "down" && "text-down", !tone && "text-fg"),
			children: value
		})]
	});
}
function Row({ label, value }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex items-baseline justify-between gap-2",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
			className: "text-xs text-muted",
			children: label
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
			className: "font-mono text-sm tabular-nums text-fg",
			children: value
		})]
	});
}
function HistoryPanel({ items, onOpen }) {
	if (items.length === 0) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-col items-center gap-3 py-16 text-center",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Clock, { className: "size-6 text-subtle" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted",
				children: "Nenhuma análise ainda."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "max-w-xs text-xs text-subtle",
				children: "As leituras ficam neste aparelho. Nada é enviado a uma conta."
			})
		]
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
		className: "space-y-2",
		children: items.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
			type: "button",
			onClick: () => onOpen(item),
			className: "flex w-full items-center gap-3 rounded-xl bg-surface p-3 text-left shadow-[var(--shadow-border)] transition-[box-shadow] duration-150 hover:shadow-[var(--shadow-border-hover)]",
			children: [item.thumb ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
				src: item.thumb,
				alt: "",
				className: "chart-print size-14 shrink-0 rounded-md object-cover"
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "flex size-14 shrink-0 items-center justify-center rounded-md bg-bg font-mono text-xs text-muted",
				children: item.displayTicker.split("/")[0]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
				className: "min-w-0 flex-1",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "block truncate text-sm font-medium text-fg",
					children: [item.displayTicker, /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "ml-2 text-muted",
						children: ["· ", timeframeLabel(item.timeframe)]
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "mt-0.5 block text-xs text-muted",
					children: [
						item.precedent.matches,
						" precedentes · ",
						formatWhen(item.createdAt)
					]
				})]
			})]
		}) }, item.id))
	});
}
var STEPS$1 = [
	{
		icon: Eye,
		title: "Leitura do print",
		body: "O modelo descreve tendência e padrão visíveis. É apoio qualitativo — não é a conta."
	},
	{
		icon: Database,
		title: "OHLC real",
		body: "O histórico do par vem da Binance: candles, RSI, médias, topos e fundos."
	},
	{
		icon: ChartColumn,
		title: "O que veio depois",
		body: "Quantas vezes essa condição já ocorreu, e a distribuição do movimento seguinte. Frequência, nunca ordem."
	}
];
function HowItWorks() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "space-y-4",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
			className: "text-xs tracking-wide text-muted uppercase",
			children: "Como funciona"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ol", {
			className: "space-y-3",
			children: STEPS$1.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
				className: "flex gap-3 rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(s.icon, { className: "mt-0.5 size-4 shrink-0 text-accent" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm font-medium text-fg",
					children: s.title
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-1 text-sm leading-relaxed text-muted",
					children: s.body
				})] })]
			}, s.title))
		})]
	});
}
function Mark({ className }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
		viewBox: "0 0 32 32",
		className: cn("text-accent", className),
		"aria-hidden": "true",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
				x: "4",
				y: "14",
				width: "5",
				height: "10",
				rx: "0.8",
				fill: "currentColor",
				opacity: "0.55"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
				x: "6.1",
				y: "10",
				width: "0.8",
				height: "18",
				fill: "currentColor",
				opacity: "0.55"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
				x: "13.5",
				y: "8",
				width: "5",
				height: "14",
				rx: "0.8",
				fill: "currentColor"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
				x: "15.6",
				y: "5",
				width: "0.8",
				height: "20",
				fill: "currentColor"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
				x: "23",
				y: "12",
				width: "5",
				height: "8",
				rx: "0.8",
				fill: "currentColor",
				opacity: "0.7"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
				x: "25.1",
				y: "9",
				width: "0.8",
				height: "14",
				fill: "currentColor",
				opacity: "0.7"
			})
		]
	});
}
var STEPS = [
	{
		id: "ohlc",
		label: "OHLC real na Binance"
	},
	{
		id: "stats",
		label: "RSI, médias, precedentes"
	},
	{
		id: "vision",
		label: "Leitura visual do print"
	}
];
function Pipeline({ step, hasImage }) {
	const visible = hasImage ? STEPS : STEPS.filter((s) => s.id !== "vision");
	const order = visible.map((s) => s.id);
	const currentIdx = step === "done" ? order.length : Math.max(0, order.indexOf(step));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ol", {
		className: "space-y-3 rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]",
		children: visible.map((s, i) => {
			const done = i < currentIdx || step === "done";
			const active = i === currentIdx && step !== "done";
			return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
				className: "flex items-center gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: cn("flex size-8 items-center justify-center rounded-sm shadow-[var(--shadow-border)]", done && "bg-accent text-accent-fg", active && "bg-bg text-accent", !done && !active && "bg-bg text-subtle"),
					children: done ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "size-4" }) : active ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "size-4 animate-spin" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "font-mono text-xs",
						children: i + 1
					})
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: cn("text-sm", active ? "text-fg" : "text-muted"),
					children: s.label
				})]
			}, s.id);
		})
	});
}
var createSsrRpc = (functionId) => {
	const url = "/_serverFn/" + functionId;
	const serverFnMeta = { id: functionId };
	const fn = async (...args) => {
		return (await getServerFnById(functionId, { origin: "server" }))(...args);
	};
	return Object.assign(fn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
var analyzeSetup = createServerFn({ method: "POST" }).validator((input) => {
	if (!input || typeof input !== "object") throw new Error("Pedido inválido.");
	const ticker = normalizeTicker(String(input.ticker ?? ""));
	if (!/^[A-Z0-9]{5,20}$/.test(ticker)) throw new Error("Ticker inválido. Ex.: BTC, ETHUSDT, SOL.");
	const timeframe = input.timeframe;
	if (!TIMEFRAMES.includes(timeframe)) throw new Error("Tempo gráfico inválido.");
	const imageDataUrl = typeof input.imageDataUrl === "string" && input.imageDataUrl.startsWith("data:image/") ? input.imageDataUrl : null;
	if (imageDataUrl && imageDataUrl.length > 18e5) throw new Error("Print grande demais. Envie um recorte do gráfico.");
	return {
		ticker,
		timeframe,
		imageDataUrl
	};
}).handler(createSsrRpc("c7aade2d1da73c515095d432d3d5ae2dda909eab2e45307ca8affe90d119707c"));
var KEY = "precedente.history.v1";
var MAX = 20;
function loadHistory() {
	if (typeof window === "undefined") return [];
	try {
		const raw = window.localStorage.getItem(KEY);
		if (!raw) return [];
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
}
function saveHistory(items) {
	if (typeof window === "undefined") return;
	try {
		window.localStorage.setItem(KEY, JSON.stringify(items.slice(0, MAX)));
	} catch {
		try {
			const slim = items.slice(0, MAX).map((a) => ({
				...a,
				thumb: null
			}));
			window.localStorage.setItem(KEY, JSON.stringify(slim));
		} catch {}
	}
}
function pushHistory(current, next) {
	const items = [next, ...current.filter((a) => a.id !== next.id)].slice(0, MAX);
	saveHistory(items);
	return items;
}
function Home() {
	const [view, setView] = (0, import_react.useState)("home");
	const [ticker, setTicker] = (0, import_react.useState)("BTC");
	const [timeframe, setTimeframe] = (0, import_react.useState)("4h");
	const [image, setImage] = (0, import_react.useState)(null);
	const [busy, setBusy] = (0, import_react.useState)(false);
	const [step, setStep] = (0, import_react.useState)("ohlc");
	const [error, setError] = (0, import_react.useState)(null);
	const [result, setResult] = (0, import_react.useState)(null);
	const [history, setHistory] = (0, import_react.useState)([]);
	(0, import_react.useEffect)(() => {
		setHistory(loadHistory());
	}, []);
	async function run() {
		setError(null);
		setBusy(true);
		setStep("ohlc");
		const t1 = window.setTimeout(() => setStep("stats"), 600);
		const t2 = window.setTimeout(() => setStep(image ? "vision" : "stats"), 1400);
		try {
			const payload = await analyzeSetup({ data: {
				ticker,
				timeframe,
				imageDataUrl: image
			} });
			const thumb = image ? await makeThumb(image) : null;
			const stored = {
				...payload,
				id: crypto.randomUUID(),
				createdAt: Date.now(),
				hasImage: Boolean(image),
				thumb
			};
			setResult(stored);
			setHistory((h) => pushHistory(h, stored));
			setStep("done");
			setView("result");
		} catch (err) {
			const message = err instanceof Error ? err.message : "Não foi possível concluir a análise.";
			setError(cleanError(message));
		} finally {
			window.clearTimeout(t1);
			window.clearTimeout(t2);
			setBusy(false);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "min-h-dvh bg-bg text-fg",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: cn("mx-auto flex w-full flex-col px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]", view !== "history" ? "max-w-5xl" : "max-w-lg"),
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "flex items-center justify-between gap-3 py-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					className: "flex items-center gap-2 text-fg",
					onClick: () => {
						setView("home");
						setError(null);
					},
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mark, { className: "size-7" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "font-display text-xl tracking-tight",
						children: "Precedente"
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("nav", {
					className: "flex rounded-md bg-surface p-1 shadow-[var(--shadow-border)]",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tab, {
						active: view === "home",
						onClick: () => setView("home"),
						children: "Analisar"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tab, {
						active: view === "history",
						onClick: () => setView("history"),
						children: "Histórico"
					})]
				})]
			}), view === "result" && result ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-4",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AnalysisResult, {
					analysis: result,
					onBack: () => {
						setView("home");
					}
				})
			}) : view === "history" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-6",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
						className: "font-display text-3xl tracking-tight",
						children: "Histórico"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 mb-6 text-sm text-muted",
						children: "Neste aparelho, sem conta."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(HistoryPanel, {
						items: history,
						onOpen: (item) => {
							setResult(item);
							setView("result");
						}
					})
				]
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-6 grid gap-10 lg:mt-10 lg:grid-cols-2 lg:items-start lg:gap-16",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-8",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-3",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs tracking-wide text-muted uppercase",
								children: "Print + ticker · nunca compre/venda"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
								className: "font-display text-4xl leading-tight tracking-tight text-fg",
								children: "Quantas vezes isso já aconteceu?"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "max-w-md text-base leading-relaxed text-muted",
								children: "O print descreve o que se vê. A estatística vem do OHLC real: RSI, médias, e o que o preço fez depois das vezes anteriores."
							})
						]
					}), busy ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pipeline, {
						step,
						hasImage: Boolean(image)
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AnalyzeForm, {
						ticker,
						timeframe,
						image,
						busy,
						error,
						onTicker: setTicker,
						onTimeframe: setTimeframe,
						onImage: setImage,
						onSubmit: () => void run()
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: cn(busy && "opacity-50"),
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HowItWorks, {})
				})]
			})]
		})
	});
}
function Tab({ active, onClick, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		type: "button",
		onClick,
		className: cn("h-9 rounded-sm px-3 text-xs font-medium", active ? "bg-bg-elevated text-fg shadow-[var(--shadow-border)]" : "text-muted"),
		children
	});
}
function cleanError(message) {
	if (message.includes("Failed to fetch") || message.includes("NetworkError")) return "Falha de rede. Tente de novo.";
	return message.replace(/^Error:\s*/, "");
}
//#endregion
export { Home as component };
