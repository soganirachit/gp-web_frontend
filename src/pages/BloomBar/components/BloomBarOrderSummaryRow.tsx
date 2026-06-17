interface Props {
  label: string;
  value: string;
  isTotal?: boolean;
}

export default function BloomBarOrderSummaryRow({ label, value, isTotal }: Props) {
  return (
    <div
      className={`flex justify-between items-center ${
        isTotal
          ? 'pt-2 border-t border-gray-200 font-bold'
          : 'text-sm text-gray-500'
      }`}
    >
      <span>{label}</span>
      <span className={isTotal ? 'font-playfair text-lg text-genda-green' : ''}>
        {value}
      </span>
    </div>
  );
}
