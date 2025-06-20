import ordisLogo from "@assets/logo-white_1750456267684.png";

export function Footer() {
  const handleFooterClick = () => {
    window.open("https://ordis.co.il", "_blank", "noopener,noreferrer");
  };

  return (
    <footer 
      className="w-full bg-[#333333] py-4 cursor-pointer hover:bg-[#404040] transition-colors"
      onClick={handleFooterClick}
    >
      <div className="max-w-[1023px] mx-auto px-4 flex items-center justify-center gap-3">
        <img 
          src={ordisLogo} 
          alt="Ordis" 
          className="h-8 w-auto"
        />
        <span className="text-white text-sm font-medium">
          Powered by Ordis. Try it for your business.
        </span>
      </div>
    </footer>
  );
}