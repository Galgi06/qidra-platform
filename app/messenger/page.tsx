import type { Metadata } from "next";
import { QidraMessengerExperience } from "@/app/investor/support/page";
import { MessengerPwaRegistration } from "@/components/messenger/MessengerPwaRegistration";
import type { SearchParams } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Qidra Messenger",
  description: "Secure communication between Qidra participants and authorised support.",
  manifest: "/messenger.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Qidra Messenger"
  }
};

export default async function MessengerPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  return (
    <>
      <MessengerPwaRegistration />
      {await QidraMessengerExperience({ messengerMode: true, searchParams })}
    </>
  );
}
