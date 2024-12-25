import {
  ComponentProps,
  ElementType,
  ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { cm } from "./utils";

const scaleOptions = [0.25, 0.5, 1, 2, 4, 8, 16, 32] as const;

function App() {
  const [svgStr, setSvgStr] = useState("");
  const [dragMode, setDragMode] = useState(false);
  const [canvasLoaded, setCanvasLoaded] = useState(false);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);
  const [outputDimension, setOutputDimension] = useState({
    width: 0,
    height: 0,
  });
  const svg = useMemo(() => {
    const div = document.createElement("div");
    div.innerHTML = svgStr;
    const svg = div.querySelector("svg")!;
    if (svg) {
      setOutputDimension({
        width: svg.viewBox.baseVal.width,
        height: svg.viewBox.baseVal.height,
      });
    }
    return svg;
  }, [svgStr]);
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    setCanvasLoaded(false);

    const { width, height } = outputDimension;
    const img = new Image(width, height);
    img.src = dataSvg(svgStr);
    img.onload = () => {
      ctx.drawImage(img, 0, 0, width, height);
      setCanvasLoaded(true);
    };

    return () => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const fullW = canvas.width;
      const fullH = canvas.height;
      ctx.clearRect(0, 0, fullW, fullH);
    };
  }, [svgStr, outputDimension]);

  return (
    <div
      className="w-full h-[100dvh] flex justify-center items-center bg-gray-950"
      onDragOver={() => setDragMode(true)}
      onDragEnd={() => setDragMode(false)}
    >
      <section className="text-white flex flex-col gap-3 justify-center items-center">
        <div className="flex flex-col gap-2 items-center">
          <span
            contentEditable
            autoFocus
            className={cm(
              "bg-gray-800 text-gray-50 outline-none rounded px-2 py-1 w-fit text-center",
              {
                "py-20 px-24 border-[2px] border-dashed border-gray-700":
                  dragMode,
              },
            )}
            onFocus={(e) => {
              const range = document.createRange();
              range.selectNodeContents(e.target);
              const sel = window.getSelection();
              sel?.removeAllRanges();
              sel?.addRange(range);
            }}
            onPaste={(e) => {
              e.preventDefault();
              const svgXml = e.clipboardData.getData("image/svg+xml");
              const svgText = e.clipboardData.getData("text/plain");
              const svg = svgXml || svgText;
              if (!svg) return;
              setSvgStr(svg);
            }}
            onChange={(e) => e.preventDefault()}
            onDrop={async (e) => {
              e.preventDefault();
              setDragMode(false);

              const svg = await e.dataTransfer.files[0].text();
              if (!svg) return;
              setSvgStr(svg);
            }}
          >
            {dragMode && "Drag into here"}
            {!dragMode && "Paste in here"}
          </span>

          <span className="text-gray-300">or</span>

          <label htmlFor="ui-svg-file-upload">
            <Button as="span" className="cursor-pointer" role="button">
              Upload
            </Button>
            <input
              id="ui-svg-file-upload"
              type="file"
              accept=".svg"
              className="hidden"
              onChange={async (e) => {
                const svgFile = e.target.files?.[0];
                if (!svgFile) return;
                const svg = await svgFile.text();
                if (!svg) return;
                setSvgStr(svg);
              }}
            />
          </label>
        </div>

        {svgStr && svg && (
          <div className="flex flex-row gap-2 bg-gray-800 rounded p-5">
            <img ref={imgRef} src={dataSvg(svgStr)} width={150} height="auto" />
            <span className="hidden">
              <canvas
                ref={canvasRef}
                width={outputDimension.width}
                height={outputDimension.height}
              />
            </span>
          </div>
        )}
        {svgStr && svg && (
          <div className="flex flex-col justify-center items-center gap-5">
            <span className="col-span-2 flex flex-row gap-1.5 py-2 justify-center">
              {scaleOptions.map((o) => (
                <Button
                  key={o}
                  onClick={() => {
                    const { width, height } = svg.viewBox.baseVal;
                    const w = Math.round(width * o);
                    const h = Math.round(height * o);
                    setOutputDimension({ width: w, height: h });
                  }}
                >
                  {o}x
                </Button>
              ))}
            </span>

            <div className="flex flex-row gap-8">
              <div className="flex flex-col justify-center items-center gap-4 bg-gray-900 p-3 rounded">
                <span>Original</span>
                <span className="flex flex-row gap-1 items-center">
                  <NumberLabel>{svg.viewBox.baseVal.width}px</NumberLabel>
                  &times;
                  <NumberLabel>{svg.viewBox.baseVal.height}px</NumberLabel>
                </span>
              </div>

              <div className="flex flex-col justify-center items-center gap-4 bg-gray-900 p-3 rounded">
                <span>Output</span>
                <span className="flex flex-row gap-1 items-center">
                  <NumberLabel>{outputDimension.width}px</NumberLabel>
                  &times;
                  <NumberLabel>{outputDimension.height}px</NumberLabel>
                </span>
              </div>
            </div>

            <div className="flex flex-row gap-4">
              <Button
                className="bg-slate-600 hover:bg-slate-500 focus:bg-slate-500 disabled:hover:bg-slate-600"
                disabled={!canvasLoaded}
                onClick={async () => {
                  if (!canvasRef.current) return;
                  const blob = await new Promise<Blob | null>((res) =>
                    canvasRef.current!.toBlob(res),
                  );
                  if (!blob) return;
                  await navigator.clipboard.write([
                    new ClipboardItem({ [blob.type]: blob }),
                  ]);
                  setCopied(true);
                }}
              >
                {copied && "Copied!"}
                {!copied && "Copy to clipboard"}
              </Button>
              <a
                href={getOctStreamDataUri(canvasRef.current)}
                download="output.png"
              >
                <Button
                  className="bg-indigo-700 hover:bg-indigo-600 focus:bg-indigo-600 disabled:hover:bg-indigo-700"
                  disabled={!canvasLoaded}
                >
                  Download
                </Button>
              </a>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

export default App;

function NumberLabel({ children }: { children?: ReactNode }) {
  return (
    <span className="font-mono bg-gray-800 rounded px-1.5 py-0.5">
      {children}
    </span>
  );
}

function Button<T extends ElementType>({
  className,
  as,
  ...rest
}: ComponentProps<"button"> & { as?: T }) {
  const Element = as || "button";
  return (
    <Element
      className={cm(
        "bg-gray-700 hover:bg-gray-600 focus:bg-gray-600 outline-none px-3 py-1.5 rounded",
        "disabled:hover:bg-gray-700 disabled:opacity-65 disabled:cursor-not-allowed",
        className,
      )}
      {...rest}
    />
  );
}

function dataSvg(svg: string) {
  const dataHeader = "data:image/svg+xml;charset=utf-8";
  return `${dataHeader},${encodeURIComponent(svg)}`;
}

function getOctStreamDataUri(canvas: HTMLCanvasElement | null) {
  if (!canvas) return "";
  return canvas
    .toDataURL("image/png")
    .replace(/^data:image\/[^;]/, "data:application/octet-stream");
}
