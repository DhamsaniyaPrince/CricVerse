import React from 'react';
import { Metadata } from 'next';
import { getApiUrl } from '@/utils/urlHelper';

interface Props {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const apiUrl = getApiUrl();
  
  try {
    const response = await fetch(`${apiUrl}/api/players/${id}`, { cache: 'no-store' });
    const json = await response.json();
    
    if (json.success && json.data) {
      const player = json.data;
      const title = `${player.name} - Player Profile | CricVerse`;
      const description = `${player.name} is a ${player.role} on CricVerse. Stats: ${player.stats?.batting?.runs || 0} Runs | ${player.stats?.bowling?.wickets || 0} Wickets | ${player.mvpAwards || 0} MVP Awards.`;
      const imageUrl = player.avatar || 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=300';
      
      return {
        title,
        description,
        openGraph: {
          title,
          description,
          type: 'profile',
          username: player.username || id,
          images: [
            {
              url: imageUrl,
              width: 300,
              height: 300,
              alt: player.name
            }
          ]
        },
        twitter: {
          card: 'summary',
          title,
          description,
          images: [imageUrl]
        }
      };
    }
  } catch (error) {
    console.error('Error fetching player metadata for layout:', error);
  }

  // Fallback
  return {
    title: 'Player Profile | CricVerse',
    description: 'View player stats, awards history, and form analytics on CricVerse.'
  };
}

export default function PlayerLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
