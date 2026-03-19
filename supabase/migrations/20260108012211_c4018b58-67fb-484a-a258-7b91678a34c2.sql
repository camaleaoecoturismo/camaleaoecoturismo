
-- Fix inconsistent month values in tours table
UPDATE tours SET month = 'Agosto' WHERE month = 'AGO';
UPDATE tours SET month = 'Setembro' WHERE month = 'SET';
UPDATE tours SET month = 'Outubro' WHERE month = 'OUT';
UPDATE tours SET month = 'Novembro' WHERE month = 'NOV';
UPDATE tours SET month = 'Dezembro' WHERE month IN ('DEZ', 'DECEMBER');
