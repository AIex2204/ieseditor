import { useEffect, useState } from 'react';
import type { PhotometryDoc } from '../../core/ies/types';
import { useAppStore } from '../../state/store';

/**
 * Общий паттерн для инструментов правки: baseDoc — рабочий документ, каким
 * он был в момент открытия ЭТОГО инструмента (заморожен один раз при
 * монтировании, показывается на графике как опорная кривая "было").
 * Каждое изменение параметров сразу уходит в общий рабочий документ через
 * write(), поэтому переключение на другой инструмент или вкладку ничего не
 * теряет — накрученное уже в рабочем состоянии. Зафиксировать результат
 * версией файла — кнопка «Сохранить», откатить всё — «Отменить изменения».
 */
export function useLiveEdit(sourceDoc: PhotometryDoc) {
  const updateWorking = useAppStore((s) => s.updateWorking);
  const setPreviewBaseline = useAppStore((s) => s.setPreviewBaseline);
  const [baseDoc] = useState(sourceDoc);

  useEffect(() => {
    setPreviewBaseline(baseDoc);
    return () => setPreviewBaseline(null);
    // baseDoc умышленно не в зависимостях — фиксируем ровно на момент монтирования инструмента
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function write(doc: PhotometryDoc) {
    updateWorking(doc);
  }

  return { baseDoc, write };
}
