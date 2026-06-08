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
    <div className="grid gap-5 rounded-[16px] border border-qidra-grayLight bg-qidra-grayLight p-4 xl:grid-cols-[240px_minmax(0,1fr)] xl:items-center">
      <div className="mx-auto grid size-[220px] place-items-center rounded-[14px] bg-white p-3 shadow-[0_0_0_1px_rgba(18,20,23,0.08)] xl:mx-0">
        {qrCode ? (
          <Image alt={isRu ? "QR-код адреса USDT TRC20" : "USDT TRC20 address QR code"} src={qrCode} width={196} height={196} unoptimized />
        ) : (
          <span className="text-center text-14 text-qidra-grayBlue">{isRu ? "QR-код загружается" : "QR code loading"}</span>
        )}
      </div>
      <div className="min-w-0">
        <p className="text-14 font-semibold text-qidra-dark">{isRu ? "Личный адрес для USDT TRC20" : "Personal USDT TRC20 address"}</p>
        <code className="mt-3 block max-w-full overflow-hidden break-all rounded-[12px] bg-white px-4 py-4 font-mono text-14 leading-relaxed text-qidra-dark">{address}</code>
        <div className="mt-4 grid gap-3 sm:grid-cols-[auto_1fr] sm:items-center">
          <Button className="w-full sm:w-auto" onClick={handleCopy} size="sm" type="button" variant="dark">
            {copied ? (isRu ? "Скопировано" : "Copied") : isRu ? "Скопировать" : "Copy"}
          </Button>
          <p className="text-12 leading-relaxed text-qidra-grayBlue">{isRu ? "Отправляйте только USDT в сети TRC20. Адрес закреплён за вашим кабинетом." : "Send only USDT on the TRC20 network. This address is assigned to your account."}</p>
        </div>
      </div>
    </div>
  );
}
