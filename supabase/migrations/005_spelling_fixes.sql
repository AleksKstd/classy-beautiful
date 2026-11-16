-- Spelling fixes for procedure names and categories that are already in the
-- database. Safe to re-run. The category text must match the names used by
-- the site, otherwise those procedures are listed under "Други".

UPDATE procedures
   SET type = replace(type, 'лимфендренаж', 'лимфодренаж'),
       name = replace(name, 'лимфендренаж', 'лимфодренаж')
 WHERE type LIKE '%лимфендренаж%' OR name LIKE '%лимфендренаж%';

UPDATE procedures
   SET name = replace(name, '10 ноктя', '10 нокътя')
 WHERE name LIKE '%10 ноктя%';

UPDATE procedures
   SET name = replace(name, 'лифтинг бузи и скули', 'лифтинг на бузи и скули')
 WHERE name LIKE '%лифтинг бузи и скули%';
