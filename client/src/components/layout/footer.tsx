import ordisLogo from "@assets/logo-white_1750456267684.png";

export function Footer() {
  const handleClick = () => {
    window.open("https://ordis.co.il", "_blank", "noopener,noreferrer");
  };

  return (
    <footer className="w-full bg-[#333333] py-4">
      <div className="max-w-[1023px] mx-auto px-4 flex items-center justify-center gap-3">
        <img 
          src={ordisLogo} 
          alt="Ordis" 
          className="h-8 w-auto cursor-pointer hover:opacity-80 transition-opacity"
          onClick={handleClick}
        />
        <span className="text-white text-sm font-medium">
          Powered by Ordis. 
          <span 
            className="cursor-pointer hover:underline ml-1 text-orange-500"
            onClick={handleClick}
          >
            Try it for your business.
          </span>
        </span>
      </div>
    </footer>
  );
}