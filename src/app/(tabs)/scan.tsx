import { ScreenPlaceholder } from "@/components/screen-placeholder";

export default function ScanScreen() {
  return (
    <ScreenPlaceholder
      milestone="Milestone 4"
      title="Scan"
      description="The camera barcode scanner goes here. On a successful scan it routes to /product/[barcode]."
    />
  );
}
