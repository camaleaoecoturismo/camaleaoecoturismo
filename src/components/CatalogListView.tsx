import React, { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Star, Sparkles, Download, FileSpreadsheet, FileText } from 'lucide-react';
import { formatarDataLocal } from '@/lib/utils';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';

interface TourItem {
  id: string;
  nome: string;
  data_passeio: string;
  data_fim: string | null;
  cidade: string;
  estado: string;
  ativo: boolean;
  isExclusive: boolean;
  isFeatured: boolean;
}

interface CatalogListViewProps {
  tours: TourItem[];
}

export const CatalogListView: React.FC<CatalogListViewProps> = ({ tours }) => {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Agrupar tours por ano e ordenar por data
  const toursByYear = useMemo(() => {
    const grouped: Record<number, TourItem[]> = {};
    
    tours.forEach(tour => {
      const year = new Date(tour.data_passeio + 'T12:00:00').getFullYear();
      if (!grouped[year]) {
        grouped[year] = [];
      }
      grouped[year].push(tour);
    });

    // Ordenar tours dentro de cada ano por data
    Object.keys(grouped).forEach(year => {
      grouped[parseInt(year)].sort((a, b) => 
        new Date(a.data_passeio).getTime() - new Date(b.data_passeio).getTime()
      );
    });

    return grouped;
  }, [tours]);

  // Ordenar anos em ordem decrescente
  const sortedYears = useMemo(() => 
    Object.keys(toursByYear)
      .map(Number)
      .sort((a, b) => b - a),
    [toursByYear]
  );

  const formatDateRange = (startDate: string, endDate: string | null) => {
    const start = formatarDataLocal(startDate);
    if (!endDate || endDate === startDate) {
      return start;
    }
    const end = formatarDataLocal(endDate);
    return `${start} - ${end}`;
  };

  const handleDownloadExcel = () => {
    const exportData: any[] = [];
    let globalIndex = 1;

    sortedYears.forEach(year => {
      toursByYear[year].forEach((tour) => {
        exportData.push({
          '#': globalIndex,
          'Ano': year,
          'Nome': tour.nome,
          'Data': formatDateRange(tour.data_passeio, tour.data_fim),
          'Cidade': tour.cidade,
          'Estado': tour.estado,
          'Status': tour.ativo ? 'Ativo' : 'Inativo',
          'Destaque': tour.isFeatured ? 'Sim' : 'Não',
          'Exclusivo': tour.isExclusive ? 'Sim' : 'Não'
        });
        globalIndex++;
      });
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);

    ws['!cols'] = [
      { wch: 5 },
      { wch: 6 },
      { wch: 40 },
      { wch: 25 },
      { wch: 20 },
      { wch: 8 },
      { wch: 8 },
      { wch: 10 },
      { wch: 10 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Catálogo de Passeios');
    const fileName = `catalogo-passeios-${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pageWidth - (margin * 2);
      
      // Colors
      const primaryColor: [number, number, number] = [34, 139, 34]; // Forest green
      const headerBg: [number, number, number] = [240, 248, 240]; // Light green
      const textColor: [number, number, number] = [50, 50, 50];
      const mutedColor: [number, number, number] = [120, 120, 120];
      
      let yPosition = margin;

      // Header
      pdf.setFillColor(...primaryColor);
      pdf.rect(0, 0, pageWidth, 35, 'F');
      
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(24);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Catálogo de Passeios', margin, 18);
      
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Camaleão Ecoturismo • ${tours.length} passeios`, margin, 28);
      
      // Date on right
      pdf.setFontSize(10);
      const dateStr = new Date().toLocaleDateString('pt-BR', { 
        day: '2-digit', 
        month: 'long', 
        year: 'numeric' 
      });
      pdf.text(dateStr, pageWidth - margin - pdf.getTextWidth(dateStr), 28);
      
      yPosition = 45;

      // Summary stats
      const totalTours = tours.length;
      const activeTours = tours.filter(t => t.ativo).length;
      const featuredTours = tours.filter(t => t.isFeatured).length;
      const exclusiveTours = tours.filter(t => t.isExclusive).length;

      pdf.setFillColor(248, 250, 252);
      pdf.roundedRect(margin, yPosition, contentWidth, 18, 3, 3, 'F');
      
      pdf.setTextColor(...textColor);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      
      const statsY = yPosition + 11;
      const statWidth = contentWidth / 4;
      
      const stats = [
        { label: 'Total', value: totalTours.toString() },
        { label: 'Ativos', value: activeTours.toString() },
        { label: 'Destaque', value: featuredTours.toString() },
        { label: 'Exclusivos', value: exclusiveTours.toString() }
      ];
      
      stats.forEach((stat, i) => {
        const x = margin + (statWidth * i) + (statWidth / 2);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(14);
        pdf.text(stat.value, x, statsY - 2, { align: 'center' });
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.setTextColor(...mutedColor);
        pdf.text(stat.label, x, statsY + 4, { align: 'center' });
        pdf.setTextColor(...textColor);
      });
      
      yPosition += 28;

      // Column widths
      const colWidths = {
        num: 10,
        nome: 70,
        data: 35,
        cidade: 35,
        estado: 15
      };

      // Draw table for each year
      for (const year of sortedYears) {
        const yearTours = toursByYear[year];
        
        // Check if we need a new page
        const estimatedHeight = 20 + (yearTours.length * 8);
        if (yPosition + estimatedHeight > pageHeight - margin) {
          pdf.addPage();
          yPosition = margin;
        }

        // Year header
        pdf.setFillColor(...primaryColor);
        pdf.roundedRect(margin, yPosition, contentWidth, 12, 2, 2, 'F');
        
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.text(year.toString(), margin + 5, yPosition + 8);
        
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        const countText = `${yearTours.length} passeio${yearTours.length !== 1 ? 's' : ''}`;
        pdf.text(countText, pageWidth - margin - 5 - pdf.getTextWidth(countText), yPosition + 8);
        
        yPosition += 16;

        // Table header
        pdf.setFillColor(...headerBg);
        pdf.rect(margin, yPosition, contentWidth, 8, 'F');
        
        pdf.setTextColor(...mutedColor);
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'bold');
        
        let xPos = margin + 2;
        pdf.text('#', xPos, yPosition + 5.5);
        xPos += colWidths.num;
        pdf.text('NOME', xPos, yPosition + 5.5);
        xPos += colWidths.nome;
        pdf.text('DATA', xPos, yPosition + 5.5);
        xPos += colWidths.data;
        pdf.text('CIDADE', xPos, yPosition + 5.5);
        xPos += colWidths.cidade;
        pdf.text('UF', xPos, yPosition + 5.5);
        
        yPosition += 10;

        // Table rows
        yearTours.forEach((tour, index) => {
          // Check for page break
          if (yPosition > pageHeight - margin - 10) {
            pdf.addPage();
            yPosition = margin;
            
            // Repeat table header on new page
            pdf.setFillColor(...headerBg);
            pdf.rect(margin, yPosition, contentWidth, 8, 'F');
            
            pdf.setTextColor(...mutedColor);
            pdf.setFontSize(8);
            pdf.setFont('helvetica', 'bold');
            
            let xP = margin + 2;
            pdf.text('#', xP, yPosition + 5.5);
            xP += colWidths.num;
            pdf.text('NOME', xP, yPosition + 5.5);
            xP += colWidths.nome;
            pdf.text('DATA', xP, yPosition + 5.5);
            xP += colWidths.data;
            pdf.text('CIDADE', xP, yPosition + 5.5);
            xP += colWidths.cidade;
            pdf.text('UF', xP, yPosition + 5.5);
            
            yPosition += 10;
          }

          // Alternating row background
          if (index % 2 === 0) {
            pdf.setFillColor(252, 252, 253);
            pdf.rect(margin, yPosition - 1, contentWidth, 8, 'F');
          }

          // Row border
          pdf.setDrawColor(230, 230, 230);
          pdf.line(margin, yPosition + 6, margin + contentWidth, yPosition + 6);

          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(9);
          
          xPos = margin + 2;
          
          // Number
          pdf.setTextColor(...mutedColor);
          pdf.text((index + 1).toString(), xPos, yPosition + 4);
          xPos += colWidths.num;
          
          // Nome with badges
          pdf.setTextColor(...textColor);
          if (!tour.ativo) {
            pdf.setTextColor(180, 180, 180);
          }
          
          let nomeText = tour.nome;
          if (nomeText.length > 35) {
            nomeText = nomeText.substring(0, 32) + '...';
          }
          pdf.text(nomeText, xPos, yPosition + 4);
          
          // Add badges
          let badgeX = xPos + pdf.getTextWidth(nomeText) + 2;
          if (tour.isFeatured) {
            pdf.setFillColor(254, 240, 138);
            pdf.circle(badgeX + 1.5, yPosition + 3, 1.5, 'F');
            badgeX += 5;
          }
          if (tour.isExclusive) {
            pdf.setFillColor(147, 197, 253);
            pdf.circle(badgeX + 1.5, yPosition + 3, 1.5, 'F');
          }
          
          xPos += colWidths.nome;
          
          // Data
          pdf.setTextColor(...textColor);
          if (!tour.ativo) {
            pdf.setTextColor(180, 180, 180);
          }
          pdf.text(formatDateRange(tour.data_passeio, tour.data_fim), xPos, yPosition + 4);
          xPos += colWidths.data;
          
          // Cidade
          let cidadeText = tour.cidade;
          if (cidadeText.length > 18) {
            cidadeText = cidadeText.substring(0, 15) + '...';
          }
          pdf.text(cidadeText, xPos, yPosition + 4);
          xPos += colWidths.cidade;
          
          // Estado
          pdf.setFont('helvetica', 'bold');
          pdf.text(tour.estado, xPos, yPosition + 4);
          
          yPosition += 8;
        });
        
        yPosition += 8;
      }

      // Footer
      const totalPages = pdf.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(...mutedColor);
        pdf.text(
          `Página ${i} de ${totalPages}`,
          pageWidth / 2,
          pageHeight - 8,
          { align: 'center' }
        );
      }

      // Legend on last page
      pdf.setPage(totalPages);
      const legendY = pageHeight - 20;
      pdf.setFontSize(8);
      pdf.setTextColor(...mutedColor);
      
      pdf.setFillColor(254, 240, 138);
      pdf.circle(margin + 2, legendY, 1.5, 'F');
      pdf.text('Destaque', margin + 6, legendY + 1);
      
      pdf.setFillColor(147, 197, 253);
      pdf.circle(margin + 30, legendY, 1.5, 'F');
      pdf.text('Exclusivo', margin + 34, legendY + 1);

      // Save
      const fileName = `catalogo-passeios-${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  if (tours.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Nenhum passeio encontrado.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" disabled={isGeneratingPdf}>
              <Download className="h-4 w-4 mr-2" />
              {isGeneratingPdf ? 'Gerando...' : 'Baixar Lista'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleDownloadPdf}>
              <FileText className="h-4 w-4 mr-2 text-red-500" />
              Baixar como PDF
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDownloadExcel}>
              <FileSpreadsheet className="h-4 w-4 mr-2 text-green-600" />
              Baixar como Excel
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {sortedYears.map(year => (
        <Card key={year}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <span className="text-xl font-bold">{year}</span>
              <Badge variant="secondary" className="text-sm">
                {toursByYear[year].length} passeio{toursByYear[year].length !== 1 ? 's' : ''}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-12 text-center">#</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead className="w-36">Data</TableHead>
                  <TableHead className="w-32">Cidade</TableHead>
                  <TableHead className="w-20">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {toursByYear[year].map((tour, index) => (
                  <TableRow 
                    key={tour.id}
                    className={!tour.ativo ? 'opacity-50' : ''}
                  >
                    <TableCell className="text-center font-medium text-muted-foreground">
                      {index + 1}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className={!tour.ativo ? 'line-through' : ''}>
                          {tour.nome}
                        </span>
                        {tour.isFeatured && (
                          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                        )}
                        {tour.isExclusive && (
                          <Sparkles className="h-4 w-4 text-blue-500" />
                        )}
                        {!tour.ativo && (
                          <Badge variant="outline" className="text-xs">
                            Inativo
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDateRange(tour.data_passeio, tour.data_fim)}
                    </TableCell>
                    <TableCell className="text-sm">{tour.cidade}</TableCell>
                    <TableCell className="text-sm font-medium">{tour.estado}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
