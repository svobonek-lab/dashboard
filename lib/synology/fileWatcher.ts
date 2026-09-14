import { SynologyDiscoveredFile } from '@/types/synology';
import { Lead, LeadFile } from '@/types';

export function getDiscoveredSynologyFiles(leads: Lead[]): SynologyDiscoveredFile[] {
  const result: SynologyDiscoveredFile[] = [
    // Zakázky (Project Documentation & Plans)
    {
      id: 'syn-file-1',
      name: 'Vykres_Kotveni_Pergola_Dvorak_v2.pdf',
      path: '/volume1/Zakazky/Dvorak_Brno_Pergola/Vykres_Kotveni_Pergola_Dvorak_v2.pdf',
      folderCategory: 'Zakazky',
      fileType: 'pdf',
      sizeBytes: 4820000,
      modifiedAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
      matchedCustomerName: 'Ing. Pavel Dvořák',
      matchedProjectTitle: 'Hliníková pergola 6x4m s bioklimatickými lamelami & LED',
      previewUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
      isAttached: true
    },
    {
      id: 'syn-file-2',
      name: 'Staticky_Posudek_Zimni_Zahrada_Svobodova.pdf',
      path: '/volume1/Zakazky/Svobodova_Kurim_Zahrada/Staticky_Posudek_Zimni_Zahrada_Svobodova.pdf',
      folderCategory: 'Zakazky',
      fileType: 'pdf',
      sizeBytes: 6140000,
      modifiedAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
      matchedCustomerName: 'MUDr. Klára Svobodová',
      matchedProjectTitle: 'Zimní zahrada SeasonLux s posuvným trojsklem',
      previewUrl: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80',
      isAttached: true
    },
    {
      id: 'syn-file-3',
      name: 'Projektova_Dokumentace_Vinarstvi_Pavlov.dwg.pdf',
      path: '/volume1/Zakazky/Vinarstvi_Pavlov/Projektova_Dokumentace_Vinarstvi_Pavlov.dwg.pdf',
      folderCategory: 'Zakazky',
      fileType: 'pdf',
      sizeBytes: 12400000,
      modifiedAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
      matchedCustomerName: 'Vinařství Pavlov s.r.o. (Mgr. Jančík)',
      matchedProjectTitle: 'Komerční zastřešení degustační terasy 12x5m',
      previewUrl: 'https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?auto=format&fit=crop&w=1200&q=80',
      isAttached: true
    },

    // Nabídky (Položkové rozpočty & Cenové kalkulace)
    {
      id: 'syn-file-4',
      name: 'Cenova_Nabidka_CN-2026-081_Dvorak.pdf',
      path: '/volume1/Nabidky/2026/Cenova_Nabidka_CN-2026-081_Dvorak.pdf',
      folderCategory: 'Nabidky',
      fileType: 'pdf',
      sizeBytes: 1250000,
      modifiedAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
      matchedCustomerName: 'Ing. Pavel Dvořák',
      matchedProjectTitle: 'Hliníková pergola 6x4m s bioklimatickými lamelami & LED',
      previewUrl: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&w=1200&q=80',
      isAttached: true
    },
    {
      id: 'syn-file-5',
      name: 'Polozkovy_Rozpocet_Kalkulace_Svoboda.xlsx',
      path: '/volume1/Nabidky/2026/Polozkovy_Rozpocet_Kalkulace_Svoboda.xlsx',
      folderCategory: 'Nabidky',
      fileType: 'excel',
      sizeBytes: 840000,
      modifiedAt: new Date(Date.now() - 1000 * 60 * 200).toISOString(),
      matchedCustomerName: 'MUDr. Klára Svobodová',
      matchedProjectTitle: 'Zimní zahrada SeasonLux s posuvným trojsklem',
      previewUrl: '',
      isAttached: true
    },

    // Realizace (Stavební deníky & Protokoly)
    {
      id: 'syn-file-6',
      name: 'Predavaci_Protokol_Zamereni_Dvorak.pdf',
      path: '/volume1/Realizace/2026_09/Predavaci_Protokol_Zamereni_Dvorak.pdf',
      folderCategory: 'Realizace',
      fileType: 'pdf',
      sizeBytes: 2100000,
      modifiedAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
      matchedCustomerName: 'Ing. Pavel Dvořák',
      matchedProjectTitle: 'Hliníková pergola 6x4m s bioklimatickými lamelami & LED',
      previewUrl: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=1200&q=80',
      isAttached: true
    },
    {
      id: 'syn-file-7',
      name: 'Stavebni_Denik_Montaz_Prochazka.pdf',
      path: '/volume1/Realizace/2026_09/Stavebni_Denik_Montaz_Prochazka.pdf',
      folderCategory: 'Realizace',
      fileType: 'pdf',
      sizeBytes: 1850000,
      modifiedAt: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
      matchedCustomerName: 'Radim Procházka',
      matchedProjectTitle: 'Stínění terasy & Screenové rolety na rodinném domě',
      previewUrl: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1200&q=80',
      isAttached: true
    },

    // Fotky (Fotodokumentace ze staveb Synology Shared Folder)
    {
      id: 'syn-file-8',
      name: 'IMG_20260914_Zamereni_Zakladove_Patky.jpg',
      path: '/volume1/Fotky/Dvorak_Pergola_Ivanovice/IMG_20260914_Zamereni_Zakladove_Patky.jpg',
      folderCategory: 'Fotky',
      fileType: 'photo',
      sizeBytes: 3450000,
      modifiedAt: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
      matchedCustomerName: 'Ing. Pavel Dvořák',
      matchedProjectTitle: 'Hliníková pergola 6x4m s bioklimatickými lamelami & LED',
      previewUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
      isAttached: true
    },
    {
      id: 'syn-file-9',
      name: 'IMG_20260914_Kotveni_Krokve_Montaz.jpg',
      path: '/volume1/Fotky/Dvorak_Pergola_Ivanovice/IMG_20260914_Kotveni_Krokve_Montaz.jpg',
      folderCategory: 'Fotky',
      fileType: 'photo',
      sizeBytes: 4120000,
      modifiedAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
      matchedCustomerName: 'Ing. Pavel Dvořák',
      matchedProjectTitle: 'Hliníková pergola 6x4m s bioklimatickými lamelami & LED',
      previewUrl: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80',
      isAttached: true
    },
    {
      id: 'syn-file-10',
      name: 'IMG_20260913_Stavba_Zimni_Zahrada_Profil.jpg',
      path: '/volume1/Fotky/Svobodova_Kurim/IMG_20260913_Stavba_Zimni_Zahrada_Profil.jpg',
      folderCategory: 'Fotky',
      fileType: 'photo',
      sizeBytes: 5230000,
      modifiedAt: new Date(Date.now() - 1000 * 60 * 400).toISOString(),
      matchedCustomerName: 'MUDr. Klára Svobodová',
      matchedProjectTitle: 'Zimní zahrada SeasonLux s posuvným trojsklem',
      previewUrl: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80',
      isAttached: true
    },
    {
      id: 'syn-file-11',
      name: 'IMG_20260912_Terasa_Pred_Montazi.jpg',
      path: '/volume1/Fotky/Prochazka_Slavkov/IMG_20260912_Terasa_Pred_Montazi.jpg',
      folderCategory: 'Fotky',
      fileType: 'photo',
      sizeBytes: 2980000,
      modifiedAt: new Date(Date.now() - 1000 * 60 * 600).toISOString(),
      matchedCustomerName: 'Radim Procházka',
      matchedProjectTitle: 'Stínění terasy & Screenové rolety na rodinném domě',
      previewUrl: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
      isAttached: true
    }
  ];

  // If we have leads in the system, try to match by name
  if (leads && leads.length > 0) {
    result.forEach(file => {
      const match = leads.find(l => 
        (file.matchedCustomerName && l.customerName.toLowerCase().includes(file.matchedCustomerName.toLowerCase())) ||
        (file.matchedProjectTitle && l.title.toLowerCase().includes(file.matchedProjectTitle.toLowerCase())) ||
        (l.customerName && file.path.toLowerCase().includes(l.customerName.toLowerCase().replace(/[^a-z]/g, '')))
      );
      if (match) {
        file.matchedProjectId = match.id;
        file.matchedProjectTitle = match.title;
        file.matchedCustomerName = match.customerName;
      }
    });
  }

  return result;
}

export function convertSynologyFileToLeadFile(file: SynologyDiscoveredFile): LeadFile {
  let category: 'Before' | 'During' | 'After' | 'General' = 'General';
  if (file.folderCategory === 'Fotky') {
    if (file.name.toLowerCase().includes('pred') || file.name.toLowerCase().includes('zamereni')) {
      category = 'Before';
    } else if (file.name.toLowerCase().includes('montaz') || file.name.toLowerCase().includes('stavba')) {
      category = 'During';
    } else {
      category = 'After';
    }
  }

  return {
    id: `syn-${file.id}`,
    name: `[Synology] ${file.name}`,
    type: file.fileType === 'photo' ? 'photo' : file.fileType === 'pdf' ? 'pdf' : 'contract',
    url: file.previewUrl || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
    uploadedAt: file.modifiedAt,
    category
  };
}
