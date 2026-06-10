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
    const response = await fetch(`${apiUrl}/api/tournaments/${id}`, { cache: 'no-store' });
    const json = await response.json();
    
    if (json.success && json.data) {
      const tournament = json.data;
      const title = `${tournament.name} - Tournament Center | CricVerse`;
      const description = `Follow standings, matches logs, and top perform stats for the ${tournament.name} on CricVerse. Format: ${tournament.format} | Fee: ${tournament.entryFee || 'Free'}. Status: ${tournament.status}.`;
      
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
              alt: tournament.name
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
    console.error('Error fetching tournament metadata for layout:', error);
  }

  // Fallback
  return {
    title: 'Tournament Center | CricVerse',
    description: 'Track team standings, matches fixtures, and player records for CricVerse leagues and championships.'
  };
}

export default function TournamentLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
