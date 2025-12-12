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
      color: 'from-orange-400 to-orange-600',
      image: '/icons/homepage/budget-icon.png',
      href: '/budget/transactions',
    },
    {
      title: 'Tasking App',
      color: 'from-blue-500 to-sky-500',
      image: '/icons/homepage/tasking-icon.png',
      href: '/tasking',
    },
    {
      title: 'Cloud App',
      color: 'from-indigo-500 to-purple-600',
      image: '/icons/homepage/cloud-icon.png',
      href: '/cloud',
    },
    {
      title: 'Supermarket App',
      color: 'from-green-500 to-emerald-600',
      image: '/icons/homepage/supermarket-icon.png',
      href: '/supermarket',
    },
    {
      title: 'Sports App',
      color: 'from-red-500 to-fuchsia-600',
      image: '/icons/homepage/sports-icon.png',
      href: 'https://sports.eguguillaume.com',
    },
    {
      title: 'Stamp App',
      color: 'from-green-400 to-red-500',
      image: '/icons/homepage/stamp-icon.png',
      href: 'https://stamp.eguguillaume.com',
    },
    {
      title: 'Portfolio',
      color: 'from-teal-500 to-cyan-600',
        image: '/icons/homepage/portfolio-icon.png',
        href: 'https://www.eguguillaume.com',
    },
    {
      title: 'Apo Gift App',
      color: 'from-pink-400 to-lime-500',
      image: '/icons/homepage/apogift-icon.png',
      href: 'https://apo.eguguillaume.com',
    },
    {
      title: 'Profile',
      color: 'from-gray-500 to-gray-700',
      image: '/icons/homepage/profile-icon.png',
      href: '/profile',
    }
  ];

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col items-center bg-white">
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
