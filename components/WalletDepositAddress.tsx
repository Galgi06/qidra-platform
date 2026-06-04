"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/Button";
import type { Locale } from "@/lib/i18n";

export function WalletDepositAddress({ address, locale }: { address: string; locale: Locale }) {
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
      await navigator.clipboard.writeText(address);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="grid gap-5 rounded-qidra border border-qidra-grayLight bg-qidra-grayLight p-4 md:grid-cols-[auto_1fr] md:items-center">
      <div className="grid size-[220px] place-items-center rounded-qidra bg-white p-3 shadow-[0_0_0_1px_rgba(18,20,23,0.08)]">
        {qrCode ? (
          <Image alt={isRu ? "QR-код адреса USDT TRC20" : "USDT TRC20 address QR code"} src={qrCode} width={196} height={196} unoptimized />
        ) : (
          <span className="text-center text-14 text-qidra-grayBlue">{isRu ? "QR-код загружается" : "QR code loading"}</span>
        )}
      </div>
      <div className="min-w-0">
        <p className="text-14 font-medium text-qidra-dark">{isRu ? "Ваш личный адрес Qidra для USDT TRC20" : "Your personal Qidra USDT TRC20 address"}</p>
        <code className="mt-3 block break-all rounded-qidra bg-white px-3 py-3 text-14 text-qidra-dark">{address}</code>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button onClick={handleCopy} size="sm" type="button" variant="dark">
            {copied ? (isRu ? "Скопировано" : "Copied") : isRu ? "Скопировать" : "Copy"}
          </Button>
          <p className="text-12 text-qidra-grayBlue">{isRu ? "Отправляйте только USDT в сети TRC20." : "Send only USDT on the TRC20 network."}</p>
        </div>
      </div>
    </div>
  );
}
