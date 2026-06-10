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
    const response = await fetch(`${apiUrl}/api/matches/${id}`, { cache: 'no-store' });
    const json = await response.json();
    
    if (json.success && json.data) {
      const match = json.data;
      const title = `${match.teamA?.name || 'Team A'} vs ${match.teamB?.name || 'Team B'} - Match Summary | CricVerse`;
      
      let description = '';
      if (match.status === 'Completed') {
        const winnerName = match.result?.winner === match.teamA?._id ? match.teamA?.name : match.teamB?.name;
        description = `Match Completed. Winner: ${winnerName} (${match.result?.margin}). Score: ${match.teamA?.name} ${match.score?.teamA?.runs}/${match.score?.teamA?.wickets} vs ${match.teamB?.name} ${match.score?.teamB?.runs}/${match.score?.teamB?.wickets}.`;
      } else {
        description = `${match.status} match between ${match.teamA?.name} and ${match.teamB?.name} at ${match.venue}.`;
      }
      
      return {
        title,
        description,
        openGraph: {
          title,
          description,
          type: 'website',
          images: [
            {
              url: 'https://images.unsplash.com/photo-1540747737956-378724044453?auto=format&fit=crop&q=80&w=400',
              width: 400,
              height: 300,
              alt: 'Cricket Match Summary'
            }
          ]
        },
        twitter: {
          card: 'summary_large_image',
          title,
          description,
          images: ['https://images.unsplash.com/photo-1540747737956-378724044453?auto=format&fit=crop&q=80&w=400']
        }
      };
    }
  } catch (error) {
    console.error('Error fetching match metadata for layout:', error);
  }

  // Fallback
  return {
    title: 'Match Summary | CricVerse',
    description: 'View real-time scorecard, commentary logs, and dynamic awards for CricVerse matches.'
  };
}

export default function MatchLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
