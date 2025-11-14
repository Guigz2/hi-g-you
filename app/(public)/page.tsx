import Image from "next/image";
import { Press_Start_2P } from "next/font/google";

const pressStart = Press_Start_2P({
  subsets: ["latin"],
  weight: "400",
});

export default function Home() {

    const apps = [
    {
      title: 'Budget App',
      color: 'from-red-500 to-orange-500',
      image: '/icons/homepage//budget-icon.png',
      href: '/(app)/budget',
    },
    {
      title: 'Tasking App',
      color: 'from-blue-500 to-cyan-500',
      image: '/icons/homepage/tasking-icon.png',
      href: '/(app)/tasking',
    },
    {
      title: 'Supermarket App',
      color: 'from-green-500 to-lime-500',
      image: '/icons/homepage//supermarket-icon.png',
      href: '/(app)/supermarket',
    },
    {
      title: 'Sports app',
      color: 'from-yellow-400 to-red-400',
      image: '/icons/homepage/sports-icon.png',
      href: 'https://sports.eguguillaume.com',
    }
  ];

  return (
    <main className="min-h-screen bg-white text-black flex flex-col items-center">
      {/* Header */}
      <div className="w-full bg-gradient-to-r from-pink-400 to-purple-600 py-12 text-center">
        <h1 className={`${pressStart.className} text-3xl md:text-5xl font-bold text-white`}>
          Select your application 
        </h1>
      </div>

      {/* App Cards */}
      <div className="flex flex-wrap justify-center gap-8 p-8">
        {apps.map((app) => (
          <a
            key={app.title}
            href={app.href}
            className={`w-80 h-24 rounded-lg bg-gradient-to-br ${app.color} shadow-md hover:scale-105 transition-transform flex items-center gap-4 px-4`}
          >
            <img src={app.image} alt={app.title} className="h-16 w-16" />
            <span className={`${pressStart.className} text-lg text-black`}>
              {app.title}
            </span>
          </a>
        ))}
      </div>
    </main>
  );
}
