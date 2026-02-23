import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { X } from 'lucide-react';
import { format, addMonths } from 'date-fns';

interface VacationRequestModalProps {
    userId: string;
    onClose: () => void;
}

export const VacationRequestModal: React.FC<VacationRequestModalProps> = ({ userId, onClose }) => {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!startDate || !endDate) {
            alert("Seleziona sia la data di inizio che quella fine.");
            return;
        }

        if (new Date(startDate) > new Date(endDate)) {
            alert("La data di fine non può essere precedente alla data di inizio.");
            return;
        }

        setSaving(true);

        const { error } = await supabase
            .from('vacation_requests')
            .insert([
                {
                    user_id: userId,
                    start_date: startDate,
                    end_date: endDate,
                    status: 'pending' // Default status
                }
            ]);

        if (error) {
            console.error(error);
            alert("Errore durante l'invio della richiesta.");
        } else {
            alert("Richiesta inviata con successo!");
            onClose();
        }

        setSaving(false);
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: 400 }}>
                <div className="modal-header">
                    <h3>Richiedi Ferie</h3>
                    <button className="icon-btn" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                <div className="modal-body">
                    <p style={{ fontSize: 14, color: 'var(--md-on-surface-variant)', marginBottom: 20 }}>
                        Seleziona le date in cui desideri andare in ferie. La richiesta verrà inviata all'amministrazione per l'approvazione.
                    </p>

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div className="auth-field">
                            <label className="auth-label">Data di inizio</label>
                            <input
                                type="date"
                                className="auth-input"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                min={format(new Date(), 'yyyy-MM-dd')}
                                required
                            />
                        </div>

                        <div className="auth-field">
                            <label className="auth-label">Data di fine</label>
                            <input
                                type="date"
                                className="auth-input"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                min={startDate || format(new Date(), 'yyyy-MM-dd')}
                                max={format(addMonths(new Date(), 12), 'yyyy-MM-dd')}
                                required
                            />
                        </div>

                        <div className="modal-actions" style={{ marginTop: 16 }}>
                            <button type="button" className="secondary-btn" onClick={onClose} disabled={saving}>
                                Annulla
                            </button>
                            <button type="submit" className="save-btn" disabled={saving}>
                                {saving ? 'Invio...' : 'Invia Richiesta'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};
