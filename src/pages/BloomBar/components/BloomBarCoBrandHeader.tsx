const LOGO_URL =
  'https://media.base44.com/images/public/6a19710a955d0c68cf58358a/4b879ad11_logo-GP-Black.png';

interface Hotel {
  name?: string;
  [key: string]: unknown;
}

interface Props {
  hotel?: Hotel | null;
}

export default function BloomBarCoBrandHeader({ hotel }: Props) {
  return (
    <div className="flex items-center justify-between px-5 py-4 bg-white border-b border-gray-200">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-genda-cream flex items-center justify-center p-1 flex-shrink-0">
          <img src={LOGO_URL} alt="Genda Phool" className="w-full h-full object-contain" />
        </div>
        <span className="font-playfair font-semibold text-sm">BloomBar</span>
        <span className="text-xs text-gray-400">by Genda Phool</span>
      </div>
      {hotel?.name && (
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <span>at</span>
          <span className="font-medium text-gray-800">{hotel.name}</span>
        </div>
      )}
    </div>
  );
}
