"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/Button";
import type { Locale } from "@/lib/i18n";

export function WalletDepositAddress({ address, locale, shared = false }: { address: string; locale: Locale; shared?: boolean }) {
  const isRu = locale === "ru";
  const [copied, setCopied] = useState(false);
  const [qrCode, setQrCode] = useState("");

  useEffect(() => {
    let mounted = true;

    QRCode.toDataURL(address, {
      color: {
        dark: "#111827",
        light: "#ffffff"
      },
      errorCorrectionLevel: "M",
      margin: 1,
      width: 220
    })
      .then((value) => {
        if (mounted) setQrCode(value);
      })
      .catch(() => {
        if (mounted) setQrCode("");
      });

    return () => {
      mounted = false;
    };
  }, [address]);

  async function handleCopy() {
    try {
      await copyText(address);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="grid gap-5 rounded-[16px] border border-qidra-grayLight bg-qidra-grayLight p-4 xl:grid-cols-[240px_minmax(0,1fr)] xl:items-center">
      <div className="mx-auto grid size-[220px] place-items-center rounded-[14px] bg-white p-3 shadow-[0_0_0_1px_rgba(18,20,23,0.08)] xl:mx-0">
        {qrCode ? (
          <Image alt={isRu ? "QR-код адреса USDT TRC20" : "USDT TRC20 address QR code"} src={qrCode} width={196} height={196} unoptimized />
        ) : (
          <span className="text-center text-14 text-qidra-grayBlue">{isRu ? "QR-код загружается" : "QR code loading"}</span>
        )}
      </div>
      <div className="min-w-0">
        <p className="text-14 font-semibold text-qidra-dark">
          {shared ? (isRu ? "Основной адрес приёма USDT TRC20" : "Main USDT TRC20 receiving address") : isRu ? "Личный адрес для USDT TRC20" : "Personal USDT TRC20 address"}
        </p>
        <div className="mt-3 grid gap-2 rounded-[12px] bg-white p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <code className="block max-w-full select-all overflow-hidden break-all px-1 font-mono text-14 leading-relaxed text-qidra-dark">{address}</code>
          <Button aria-label={isRu ? "Скопировать адрес USDT TRC20" : "Copy USDT TRC20 address"} className="w-full sm:w-auto" onClick={handleCopy} size="sm" type="button" variant="outline">
            {copied ? (isRu ? "Скопировано" : "Copied") : isRu ? "Копировать" : "Copy"}
          </Button>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-[auto_1fr] sm:items-center">
          <Button className="w-full sm:w-auto" onClick={handleCopy} size="sm" type="button" variant="dark">
            {copied ? (isRu ? "Скопировано" : "Copied") : isRu ? "Скопировать" : "Copy"}
          </Button>
          <p className="text-12 leading-relaxed text-qidra-grayBlue">
            {shared
              ? isRu
                ? "Отправляйте только USDT в сети TRC20. Это основной адрес приёма Qidra для пополнений."
                : "Send only USDT on the TRC20 network. This is Qidra's main receiving address for deposits."
              : isRu
                ? "Отправляйте только USDT в сети TRC20. Адрес закреплён за вашим кабинетом."
                : "Send only USDT on the TRC20 network. This address is assigned to your account."}
          </p>
        </div>
      </div>
    </div>
  );
}

async function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.style.top = "0";
  document.body.append(textarea);
  textarea.select();

  try {
    if (!document.execCommand("copy")) {
      throw new Error("copy_failed");
    }
  } finally {
    textarea.remove();
  }
}
