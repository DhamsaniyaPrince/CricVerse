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
    const response = await fetch(`${apiUrl}/api/teams/${id}`, { cache: 'no-store' });
    const json = await response.json();
    
    if (json.success && json.data) {
      const team = json.data;
      const title = `${team.name} - Team Profile | CricVerse`;
      const description = `Check out the squad, statistics, and standings for ${team.name} on CricVerse. Captained by ${team.captain?.name || 'n/a'}. Stats: Played: ${team.stats?.played || 0} | Won: ${team.stats?.won || 0} | Lost: ${team.stats?.lost || 0}.`;
      const imageUrl = team.logo || 'https://images.unsplash.com/photo-1540747737956-378724044453?auto=format&fit=crop&q=80&w=300';
      
      return {
        title,
        description,
        openGraph: {
          title,
          description,
          type: 'website',
          images: [
            {
              url: imageUrl,
              width: 300,
              height: 300,
              alt: team.name
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
    console.error('Error fetching team metadata for layout:', error);
  }

  // Fallback
  return {
    title: 'Team Profile | CricVerse',
    description: 'View team squads, fixtures history, and seasonal leaderboard positions on CricVerse.'
  };
}

export default function TeamLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
